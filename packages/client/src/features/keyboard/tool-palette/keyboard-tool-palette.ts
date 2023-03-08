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
import { PaletteItem, RequestMarkersAction, TriggerNodeCreationAction } from '@eclipse-glsp/protocol';
import { injectable } from 'inversify';
import { EnableDefaultToolsAction, SetUIExtensionVisibilityAction } from 'sprotty';
import { KeyCode, matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { MouseDeleteTool } from '../../tools/delete-tool';
import { MarqueeMouseTool } from '../../tools/marquee-mouse-tool';
import { createIcon, changeCodiconClass, createToolGroup, ToolPalette, compare } from '../../../features/tool-palette/tool-palette';
import { KeyboardGridUI } from '../grid/constants';

const SEARCH_ICON_ID = 'search';
const PALETTE_ICON_ID = 'symbol-color';
const CHEVRON_DOWN_ICON_ID = 'chevron-right';
const PALETTE_HEIGHT = '500px';
const SELECTION_TOOL_KEY: KeyCode = 'Digit1';
const DELETION_TOOL_KEY: KeyCode = 'Digit2';
const MARQUEE_TOOL_KEY: KeyCode = 'Digit3';
const VALIDATION_TOOL_KEY: KeyCode = 'Digit4';
const SEARCH_TOOL_KEY: KeyCode = 'Digit5';

const AVAILABLE_KEYS: KeyCode[] = [
    'KeyA',
    'KeyB',
    'KeyC',
    'KeyD',
    'KeyE',
    'KeyF',
    'KeyG',
    'KeyH',
    'KeyI',
    'KeyJ',
    'KeyK',
    'KeyL',
    'KeyM',
    'KeyN',
    'KeyO',
    'KeyP',
    'KeyQ',
    'KeyR',
    'KeyS',
    'KeyT',
    'KeyU',
    'KeyV',
    'KeyX',
    'KeyY',
    'KeyZ'
];

const HEADER_TOOL_KEYS: KeyCode[] = [SELECTION_TOOL_KEY, DELETION_TOOL_KEY, MARQUEE_TOOL_KEY, VALIDATION_TOOL_KEY, SEARCH_TOOL_KEY];

@injectable()
export class KeyboardToolPalette extends ToolPalette {
    protected deleteToolButton: HTMLElement;
    protected marqueeToolButton: HTMLElement;
    protected validateToolButton: HTMLElement;
    protected searchToolButton: HTMLElement;

    protected keyboardIndexButtonMapping = new Map<number, HTMLElement>();
    protected headerToolsButtonMapping = new Map<number, HTMLElement>();
    protected get interactablePaletteItems(): PaletteItem[] {
        return this.paletteItems
            .sort(compare)
            .map(item => item.children?.sort(compare) ?? [item])
            .reduce((acc, val) => acc.concat(val), []);
    }

    protected override initializeContents(_containerElement: HTMLElement): void {
        this.containerElement.tabIndex = 20;
        this.createHeader();
        this.createBody();
        this.lastActivebutton = this.defaultToolsButton;

        this.containerElement.onkeyup = ev => {
            this.clearToolOnEscape(ev);
            this.selectItemOnCharacter(ev);
            this.triggerHeaderToolsByKey(ev);
        };
    }

    protected override addMinimizePaletteButton(): void {
        const baseDiv = document.getElementById(this.options.baseDiv);
        const minPaletteDiv = document.createElement('div');
        minPaletteDiv.classList.add('minimize-palette-button');
        this.containerElement.classList.add('collapsible-palette');
        if (baseDiv) {
            const insertedDiv = baseDiv.insertBefore(minPaletteDiv, baseDiv.firstChild);
            const minimizeIcon = createIcon(CHEVRON_DOWN_ICON_ID);
            this.updateMinimizePaletteButtonTooltip(minPaletteDiv);
            minimizeIcon.onclick = _event => {
                if (this.isPaletteMaximized()) {
                    this.containerElement.style.overflow = 'hidden';
                    this.containerElement.style.maxHeight = '0px';
                } else {
                    this.containerElement.style.overflow = 'visible';
                    this.containerElement.style.maxHeight = PALETTE_HEIGHT;
                }
                this.updateMinimizePaletteButtonTooltip(minPaletteDiv);
                changeCodiconClass(minimizeIcon, PALETTE_ICON_ID);
                changeCodiconClass(minimizeIcon, CHEVRON_DOWN_ICON_ID);
            };
            insertedDiv.appendChild(minimizeIcon);
        }
    }

    protected override createBody(): void {
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('palette-body');
        const tabIndex = 21;
        let toolButtonCounter = 0;

        this.keyboardIndexButtonMapping.clear();
        this.paletteItems.sort(compare).forEach(item => {
            if (item.children) {
                const group = createToolGroup(item);
                item.children.sort(compare).forEach(child => {
                    const button = this.createKeyboardToolButton(child, tabIndex, toolButtonCounter);
                    group.appendChild(button);
                    this.keyboardIndexButtonMapping.set(toolButtonCounter, button);
                    toolButtonCounter++;
                });
                bodyDiv.appendChild(group);
            } else {
                const button = this.createKeyboardToolButton(item, tabIndex, toolButtonCounter);
                bodyDiv.appendChild(button);
                this.keyboardIndexButtonMapping.set(toolButtonCounter, button);
                toolButtonCounter++;
            }
        });

        if (this.paletteItems.length === 0) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.innerText = 'No results found.';
            noResultsDiv.classList.add('tool-button');
            bodyDiv.appendChild(noResultsDiv);
        }
        // Remove existing body to refresh filtered entries
        if (this.bodyDiv) {
            this.containerElement.removeChild(this.bodyDiv);
        }
        this.containerElement.appendChild(bodyDiv);
        this.bodyDiv = bodyDiv;
    }

    protected override createHeaderTools(): HTMLElement {
        this.headerToolsButtonMapping.clear();

        const headerTools = document.createElement('div');
        headerTools.classList.add('header-tools');

        this.defaultToolsButton = this.createDefaultToolButton();
        this.headerToolsButtonMapping.set(0, this.defaultToolsButton);
        headerTools.appendChild(this.defaultToolsButton);

        this.deleteToolButton = this.createMouseDeleteToolButton();
        this.headerToolsButtonMapping.set(1, this.deleteToolButton);
        headerTools.appendChild(this.deleteToolButton);

        this.marqueeToolButton = this.createMarqueeToolButton();
        this.headerToolsButtonMapping.set(2, this.marqueeToolButton);
        headerTools.appendChild(this.marqueeToolButton);

        this.validateToolButton = this.createValidateButton();
        this.headerToolsButtonMapping.set(3, this.validateToolButton);
        headerTools.appendChild(this.validateToolButton);

        // Create button for Search
        this.searchToolButton = this.createSearchButton();
        this.headerToolsButtonMapping.set(4, this.searchToolButton);
        headerTools.appendChild(this.searchToolButton);

        return headerTools;
    }

    protected override createDefaultToolButton(): HTMLElement {
        const button = createIcon('inspect');
        button.id = 'btn_default_tools';
        button.title = 'Enable selection tool';
        button.onclick = this.onClickStaticToolButton(button);
        button.appendChild(this.createKeyboardShotcut(SELECTION_TOOL_KEY));

        return button;
    }

    protected override createMouseDeleteToolButton(): HTMLElement {
        const deleteToolButton = createIcon('chrome-close');
        deleteToolButton.title = 'Enable deletion tool';
        deleteToolButton.onclick = this.onClickStaticToolButton(deleteToolButton, MouseDeleteTool.ID);
        deleteToolButton.appendChild(this.createKeyboardShotcut(DELETION_TOOL_KEY));

        return deleteToolButton;
    }

    protected override createMarqueeToolButton(): HTMLElement {
        const marqueeToolButton = createIcon('screen-full');
        marqueeToolButton.title = 'Enable marquee tool';
        marqueeToolButton.onclick = this.onClickStaticToolButton(marqueeToolButton, MarqueeMouseTool.ID);
        marqueeToolButton.appendChild(this.createKeyboardShotcut(MARQUEE_TOOL_KEY));

        return marqueeToolButton;
    }

    protected override createValidateButton(): HTMLElement {
        const validateToolButton = createIcon('pass');
        validateToolButton.title = 'Validate model';
        validateToolButton.onclick = _event => {
            const modelIds: string[] = [this.modelRootId];
            this.actionDispatcher.dispatch(RequestMarkersAction.create(modelIds));
        };
        validateToolButton.appendChild(this.createKeyboardShotcut(VALIDATION_TOOL_KEY));

        return validateToolButton;
    }

    protected override createSearchButton(): HTMLElement {
        const searchIcon = createIcon(SEARCH_ICON_ID);
        searchIcon.onclick = _ev => {
            const searchField = document.getElementById(this.containerElement.id + '_search_field');
            if (searchField) {
                if (searchField.style.display === 'none') {
                    searchField.style.display = '';
                    searchField.focus();
                } else {
                    searchField.style.display = 'none';
                }
            }
        };
        searchIcon.classList.add('search-icon');
        searchIcon.title = 'Filter palette entries';
        searchIcon.appendChild(this.createKeyboardShotcut(SEARCH_TOOL_KEY));

        return searchIcon;
    }

    protected override createHeaderSearchField(): HTMLInputElement {
        const searchField = document.createElement('input');
        searchField.classList.add('search-input');
        searchField.tabIndex = 21;
        searchField.id = this.containerElement.id + '_search_field';
        searchField.type = 'text';
        searchField.placeholder = ' Search...';
        searchField.style.display = 'none';
        searchField.onkeyup = () => this.requestFilterUpdate(this.searchField.value);
        searchField.onkeydown = ev => this.clearOnEscape(ev);

        return searchField;
    }

    protected createKeyboardShotcut(keyShortcut: KeyCode): HTMLElement {
        const hint = document.createElement('div');
        hint.classList.add('key-shortcut');
        let keyShortcutValue = keyShortcut.toString();

        if (keyShortcut.includes('Key')) {
            keyShortcutValue = keyShortcut.toString().substring(3);
        } else if (keyShortcut.includes('Digit')) {
            keyShortcutValue = keyShortcut.toString().substring(5);
        }
        hint.innerHTML = keyShortcutValue;
        return hint;
    }

    protected createKeyboardToolButton(item: PaletteItem, tabIndex: number, buttonIndex: number): HTMLElement {
        const button = document.createElement('div');
        // add keyboard index
        if (buttonIndex < AVAILABLE_KEYS.length) {
            button.appendChild(this.createKeyboardShotcut(AVAILABLE_KEYS[buttonIndex]));
        }
        button.tabIndex = tabIndex;
        button.classList.add('tool-button');
        if (item.icon) {
            button.appendChild(createIcon(item.icon));
        }
        button.insertAdjacentText('beforeend', item.label);
        button.onclick = this.onClickCreateToolButton(button, item);

        button.onkeydown = ev => {
            this.clickToolOnEnter(ev, button, item);
            this.clearToolOnEscape(ev);

            if (matchesKeystroke(ev, 'ArrowDown')) {
                if (buttonIndex + 1 > this.keyboardIndexButtonMapping.size - 1) {
                    this.selectItemViaArrowKey(this.keyboardIndexButtonMapping.get(0));
                } else {
                    this.selectItemViaArrowKey(this.keyboardIndexButtonMapping.get(buttonIndex + 1));
                }
            } else if (matchesKeystroke(ev, 'ArrowUp')) {
                if (buttonIndex - 1 < 0) {
                    this.selectItemViaArrowKey(this.keyboardIndexButtonMapping.get(this.keyboardIndexButtonMapping.size - 1));
                } else {
                    this.selectItemViaArrowKey(this.keyboardIndexButtonMapping.get(buttonIndex - 1));
                }
            }
        };

        return button;
    }

    protected clickToolOnEnter(event: KeyboardEvent, button: HTMLElement, item: PaletteItem): void {
        if (matchesKeystroke(event, 'Enter')) {
            if (!this.editorContext.isReadonly) {
                this.actionDispatcher.dispatchAll(item.actions);
                this.changeActiveButton(button);
            }
        }
    }

    /* protected selectItemOnCharacter(event: KeyboardEvent): void {
        let index: number | undefined = undefined;
        const items = this.interactablePaletteItems;

        const itemsCount = items.length < AVAILABLE_KEYS.length ? items.length : AVAILABLE_KEYS.length;

        for (let i = 0; i < itemsCount; i++) {
            const keycode = AVAILABLE_KEYS[i];
            if (matchesKeystroke(event, keycode)) {
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            this.actionDispatcher.dispatchAll(items[index].actions);
            this.changeActiveButton(this.keyboardIndexButtonMapping.get(index));
            this.keyboardIndexButtonMapping.get(index)?.focus();
        }
    }*/
    protected selectItemOnCharacter(event: KeyboardEvent): void {
        let index: number | undefined = undefined;
        const items = this.interactablePaletteItems;

        const itemsCount = items.length < AVAILABLE_KEYS.length ? items.length : AVAILABLE_KEYS.length;

        for (let i = 0; i < itemsCount; i++) {
            const keycode = AVAILABLE_KEYS[i];
            if (matchesKeystroke(event, keycode)) {
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            if (items[index].actions.some(a => a.kind === TriggerNodeCreationAction.KIND)) {
                this.actionDispatcher.dispatchAll([
                    ...items[index].actions,
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardGridUI.ID, visible: true, contextElementsId: [] })
                ]);
            }
            this.changeActiveButton(this.keyboardIndexButtonMapping.get(index));
            this.keyboardIndexButtonMapping.get(index)?.focus();
        }
    }

    protected triggerHeaderToolsByKey(event: KeyboardEvent): void {
        let index: number | undefined = undefined;

        for (let i = 0; i < HEADER_TOOL_KEYS.length; i++) {
            const keycode = HEADER_TOOL_KEYS[i];

            if (matchesKeystroke(event, keycode)) {
                event.stopPropagation();
                event.preventDefault();
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            this.headerToolsButtonMapping.get(index)?.click();
        }
    }

    protected selectItemViaArrowKey(currentButton: HTMLElement | undefined): void {
        if (currentButton !== undefined) {
            this.changeActiveButton(currentButton);
            currentButton?.focus();
        }
    }

    protected override clearToolOnEscape(event: KeyboardEvent): void {
        if (matchesKeystroke(event, 'Escape')) {
            if (event.target instanceof HTMLElement) {
                event.target.blur();
            }
            this.actionDispatcher.dispatch(EnableDefaultToolsAction.create());
        }
    }
}
