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

export interface CheatSheetKeyShortcut {
    shortcuts: string[];
    description: string;
    group: string;
    position: number;
}

export interface CheatSheetKeyShortcutProvider {
    registerShortcutKey(): void;
    deregisterShortcutKey?(): void;
}

export interface SetCheatSheetKeyShortcutAction extends Action {
    kind: typeof SetCheatSheetKeyShortcutAction.KIND;
    token: symbol;
    keys: CheatSheetKeyShortcut[];
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

    export function create(token: symbol, keys: CheatSheetKeyShortcut[]): SetCheatSheetKeyShortcutAction {
        return { kind: KIND, token, keys };
    }
}

@injectable()
export class CheatSheet extends AbstractUIExtension implements IActionHandler {
    static ID = 'cheatSheetTool';
    protected text: HTMLSpanElement;
    protected container: HTMLDivElement;
    protected shortcutsContainer: HTMLDivElement;
    protected registrations: { [key: string]: CheatSheetKeyShortcut[] } = {};

    handle(action: Action): ICommand | Action | void {
        if (EnableCheatSheetShortcutAction.is(action)) {
            return SetUIExtensionVisibilityAction.create({ extensionId: CheatSheet.ID, visible: true });
        } else if (SetCheatSheetKeyShortcutAction.is(action)) {
            this.registrations[action.token.toString()] = action.keys;
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
        this.shortcutsContainer.innerHTML = '';
        const keys = Object.values(this.registrations).flatMap(r => r);
        keys.sort((a, b) => {
            if (a.group < b.group) {
                return -1;
            }
            if (a.group > b.group) {
                return 1;
            }
            if (a.position < b.position) {
                return -1;
            }
            if (a.position > b.position) {
                return 1;
            }
            return 0;
        });
        console.log(keys);
        keys.forEach(r => {
            let groupDiv = document.getElementById(r.group);
            // eslint-disable-next-line no-null/no-null
            if (groupDiv !== null) {
                groupDiv.append(this.createEntry(r));
            } else {
                groupDiv = document.createElement('div');
                groupDiv.id = r.group;
                // create title
                const menuTitle = document.createElement('h4');
                menuTitle.innerText = r.group;
                groupDiv.appendChild(menuTitle);
                groupDiv.append(this.createEntry(r));
            }
            this.shortcutsContainer.append(groupDiv);
        });
        // keys.forEach(r => this.shortcutsContainer.append(this.createEntry(r)));
    }

    protected getShortcutHTML(shortcuts: string[]): string {
        return shortcuts.map(key => `<kbd>${key}</kbd>`).join(' + ');
    }

    protected createEntry(registration: CheatSheetKeyShortcut): HTMLDivElement {
        const divElem = document.createElement('div');
        const shortcutElement = document.createElement('p');
        const descElement = document.createElement('p');

        divElem.classList.add('shortcut-entry-container');
        descElement.textContent = registration.description;
        shortcutElement.innerHTML += this.getShortcutHTML(registration.shortcuts);

        divElem.appendChild(shortcutElement);
        divElem.appendChild(descElement);

        return divElem;
    }

    protected initializeContents(containerElement: HTMLElement): void {
        this.container = document.createElement('div');
        this.container.classList.add('keyboard-shortcuts-menu');

        // create title
        const menuTitle = document.createElement('h3');
        menuTitle.innerText = 'Keyboard Shortcuts';
        this.container.appendChild(menuTitle);

        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-btn';
        closeBtn.textContent = 'X';
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                this.hide();
            }
        });
        this.container.appendChild(closeBtn);

        // create shortcuts container
        this.shortcutsContainer = document.createElement('div');
        this.shortcutsContainer.classList.add('keyboard-shortcuts-container');
        this.container.appendChild(this.shortcutsContainer);

        containerElement.appendChild(this.container);
        this.refreshUI();
    }
}
