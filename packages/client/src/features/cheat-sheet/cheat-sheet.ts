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

export interface SetCheatSheetKeyShortcutAction extends Action {
    kind: typeof SetCheatSheetKeyShortcutAction.KIND;
    shortcut: string;
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

    export function create(shortcut: string, description: string): SetCheatSheetKeyShortcutAction {
        return { kind: KIND, shortcut, description };
    }
}

@injectable()
export class CheatSheet extends AbstractUIExtension implements IActionHandler {
    static ID = 'cheatSheetTool';
    protected text: HTMLSpanElement;
    protected container: HTMLDivElement;
    protected registrations: SetCheatSheetKeyShortcutAction[] = [];

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
        const text = this.registrations.map(r => `${r.shortcut} - ${r.description}`);
        this.text.textContent = text.join(',');
    }
    protected initializeContents(containerElement: HTMLElement): void {
        this.text = document.createElement('span');
        this.text.textContent = 'Test';
        this.container = document.createElement('div');
        this.container.classList.add('cheat-sheet-container');

        this.container.appendChild(this.text);
        containerElement.appendChild(this.container);
        this.refreshUI();
    }
}
