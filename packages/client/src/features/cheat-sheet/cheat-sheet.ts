/****************************
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
 ****************************/

import { Action } from '@eclipse-glsp/protocol';
import { injectable } from 'inversify';
import { AbstractUIExtension, IActionHandler, ICommand, SetUIExtensionVisibilityAction, SModelRoot } from 'sprotty';
import { groupBy } from 'lodash';

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
    static ID = 'cheat-sheet';
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

    override show(root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        super.show(root, ...contextElementIds);
        this.shortcutsContainer.focus();
    }
    protected refreshUI(): void {
        this.shortcutsContainer.innerHTML = '';

        const registrations = Object.values(this.registrations).flatMap(r => r);
        registrations.sort((a, b) => {
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

        const grouped = groupBy(registrations, k => k.group);

        for (const [group, shortcuts] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            const menuTitle = document.createElement('h4');
            menuTitle.innerText = group;

            groupDiv.appendChild(menuTitle);

            shortcuts.forEach(s => groupDiv.appendChild(this.createEntry(s)));

            this.shortcutsContainer.append(groupDiv);
        }
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
        closeBtn.id = 'cheat-sheet-close-btn';
        closeBtn.textContent = 'X';
        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        this.container.appendChild(closeBtn);

        // create shortcuts container
        this.shortcutsContainer = document.createElement('div');
        this.shortcutsContainer.classList.add('keyboard-shortcuts-container');
        this.shortcutsContainer.tabIndex = 30;
        this.shortcutsContainer.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                this.hide();
            }
        });

        this.container.appendChild(this.shortcutsContainer);
        containerElement.appendChild(this.container);
        containerElement.ariaLabel = 'Shortcut-Menu';

        this.refreshUI();
    }
}
