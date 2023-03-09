/********************************************************************************
 * Copyright (c) 2019-2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Action } from '@eclipse-glsp/protocol';
import { injectable } from 'inversify';
import { AbstractUIExtension, IActionHandler, ICommand, SetUIExtensionVisibilityAction } from 'sprotty';
import { KeyCode } from 'sprotty/lib/utils/keyboard';

export interface SetCheatSheetKeyShortcutAction extends Action {
    kind: typeof SetCheatSheetKeyShortcutAction.KIND;
    shortcuts: string[];
    description: string;
}

export interface EnableCheatSheetShortcutAction extends Action {
    kind: typeof EnableCheatSheetShortcutAction.KIND;
}

export namespace EnableCheatSheetShortcutAction {
    export const KIND = 'enableCheatSheetShortcut';

    export function is(object: any): object is EnableCheatSheetShortcutAction {
        return Action.hasKind(object, KIND);
    }

    export function create(): EnableCheatSheetShortcutAction {
        return { kind: KIND };
    }
}

export namespace SetCheatSheetKeyShortcutAction {
    export const KIND = 'setCheatSheetKeyShortcut';

    export function is(object: any): object is SetCheatSheetKeyShortcutAction {
        return Action.hasKind(object, KIND);
    }

    export function create(shortcuts: string[], description: string): SetCheatSheetKeyShortcutAction {
        return { kind: KIND, shortcuts: shortcuts, description };
    }
}

@injectable()
export class CheatSheet extends AbstractUIExtension implements IActionHandler {
    static ID = 'cheatSheetTool';
    protected text: HTMLSpanElement;
    protected container: HTMLDivElement;
    protected registrations: SetCheatSheetKeyShortcutAction[] = [];

    protected description: string;
    protected shortcuts: string[];

    protected descElement: HTMLParagraphElement;
    protected shortcutElement: HTMLParagraphElement;
    protected shortcutEntry: HTMLSpanElement;

    handle(action: Action): ICommand | Action | void {
        if (EnableCheatSheetShortcutAction.is(action)) {
            return SetUIExtensionVisibilityAction.create({ extensionId: CheatSheet.ID, visible: true });
        } else if (SetCheatSheetKeyShortcutAction.is(action)) {
            this.registrations.push(action);
            if (this.containerElement !== undefined) {
                this.refreshUI();
            }
        }
    }
    id(): string {
        return CheatSheet.ID;
    }
    containerClass(): string {
        return CheatSheet.ID;
    }
    protected refreshUI(): void {
        this.registrations.forEach(r => {
            console.log(r);
            this.shortcuts = r.shortcuts;
            this.description = r.description;
        });

        this.descElement.textContent = ' - ' + this.description;
        this.shortcutElement.innerHTML += this.getShortcutHTML(this.shortcuts);
    }
    protected getShortcutHTML(shortcuts: string[]): string {
        return shortcuts.map(key => `<kbd>${key}</kbd>`).join(' + ');
    }
    protected initializeContents(containerElement: HTMLElement): void {
        this.shortcutElement = document.createElement('p');
        this.descElement = document.createElement('p');
        this.shortcutEntry = document.createElement('span');

        this.shortcutEntry.classList.add('shortcut-entry-container');
        this.shortcutEntry.appendChild(this.shortcutElement);
        this.shortcutEntry.appendChild(this.descElement);

        this.container = document.createElement('div');
        this.container.classList.add('keyboard-shortcuts-menu');

        // create title
        const menuTitle = document.createElement('h3');
        menuTitle.innerText = 'Keyboard Shortcuts';

        // create unordered list
        const unorderList = document.createElement('ul');
        const listElem = document.createElement('li');
        listElem.appendChild(this.shortcutEntry);
        unorderList.appendChild(listElem);

        this.container.appendChild(menuTitle);
        this.container.appendChild(unorderList);
        containerElement.appendChild(this.container);
        this.refreshUI();
    }
}
