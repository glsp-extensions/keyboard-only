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
import { Action, PaletteItem, RequestContextActions, RequestMarkersAction, SetContextActions } from '@eclipse-glsp/protocol';
import { inject, injectable, postConstruct } from 'inversify';
import {
    AbstractUIExtension,
    EnableDefaultToolsAction,
    EnableToolsAction,
    IActionHandler,
    ICommand,
    IToolManager,
    SetUIExtensionVisibilityAction,
    SModelRoot,
    TYPES
} from 'sprotty';
import { codiconCSSClasses } from 'sprotty/lib/utils/codicon';
import { KeyCode, matchesKeystroke } from 'sprotty/lib/utils/keyboard';

import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { EditModeListener, EditorContextService } from '../../base/editor-context-service';
import { MouseDeleteTool } from '../tools/delete-tool';
import { MarqueeMouseTool } from '../tools/marquee-mouse-tool';

const CLICKED_CSS_CLASS = 'clicked';
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

export interface EnableToolPaletteAction extends Action {
    kind: typeof EnableToolPaletteAction.KIND;
}

export namespace EnableToolPaletteAction {
    export const KIND = 'enableToolPalette';

    export function is(object: any): object is EnableToolPaletteAction {
        return Action.hasKind(object, KIND);
    }

    export function create(): EnableToolPaletteAction {
        return { kind: KIND };
    }
}
@injectable()
export class ToolPalette extends AbstractUIExtension implements IActionHandler, EditModeListener {
    static readonly ID = 'tool-palette';

    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: GLSPActionDispatcher;
    @inject(TYPES.IToolManager) protected readonly toolManager: IToolManager;
    @inject(EditorContextService) protected readonly editorContext: EditorContextService;

    protected paletteItems: PaletteItem[];
    protected paletteItemsCopy: PaletteItem[] = [];
    protected bodyDiv?: HTMLElement;
    protected lastActivebutton?: HTMLElement;
    protected defaultToolsButton: HTMLElement;

    protected deleteToolButton: HTMLElement;
    protected marqueeToolButton: HTMLElement;
    protected validateToolButton: HTMLElement;
    protected searchToolButton: HTMLElement;
    protected searchField: HTMLInputElement;
    protected keyboardIndexButtonMapping = new Map<number, HTMLElement>();
    protected headerToolsButtonMapping = new Map<number, HTMLElement>();
    protected get interactablePaletteItems(): PaletteItem[] {
        return this.paletteItems
            .sort(compare)
            .map(item => item.children?.sort(compare) ?? [item])
            .reduce((acc, val) => acc.concat(val), []);
    }

    modelRootId: string;

    id(): string {
        return ToolPalette.ID;
    }
    containerClass(): string {
        return ToolPalette.ID;
    }

    @postConstruct()
    postConstruct(): void {
        this.editorContext.register(this);
    }

    override initialize(): boolean {
        if (!this.paletteItems) {
            return false;
        }
        return super.initialize();
    }

    protected initializeContents(_containerElement: HTMLElement): void {
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

    protected override onBeforeShow(_containerElement: HTMLElement, root: Readonly<SModelRoot>): void {
        this.modelRootId = root.id;
        this.containerElement.style.maxHeight = PALETTE_HEIGHT;
    }

    protected addMinimizePaletteButton(): void {
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

    protected updateMinimizePaletteButtonTooltip(button: HTMLDivElement): void {
        if (this.isPaletteMaximized()) {
            button.title = 'Minimize palette';
        } else {
            button.title = 'Maximize palette';
        }
    }

    protected isPaletteMaximized(): boolean {
        return this.containerElement && this.containerElement.style.maxHeight !== '0px';
    }

    protected createBody(): void {
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('palette-body');
        const tabIndex = 21;
        let toolButtonCounter = 0;

        this.keyboardIndexButtonMapping.clear();
        this.paletteItems.sort(compare).forEach(item => {
            if (item.children) {
                const group = createToolGroup(item);
                item.children.sort(compare).forEach(child => {
                    const button = this.createToolButton(child, tabIndex, toolButtonCounter);
                    group.appendChild(button);
                    this.keyboardIndexButtonMapping.set(toolButtonCounter, button);
                    toolButtonCounter++;
                });
                bodyDiv.appendChild(group);
            } else {
                const button = this.createToolButton(item, tabIndex, toolButtonCounter);
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

    protected createHeader(): void {
        this.addMinimizePaletteButton();
        const headerCompartment = document.createElement('div');
        headerCompartment.classList.add('palette-header');
        headerCompartment.append(this.createHeaderTitle());
        headerCompartment.appendChild(this.createHeaderTools());
        headerCompartment.appendChild((this.searchField = this.createHeaderSearchField()));
        this.containerElement.appendChild(headerCompartment);
    }

    private createHeaderTools(): HTMLElement {
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

    protected createDefaultToolButton(): HTMLElement {
        const button = createIcon('inspect');
        button.id = 'btn_default_tools';
        button.title = 'Enable selection tool';
        button.onclick = this.onClickStaticToolButton(button);
        button.appendChild(this.createKeyboardShotcut(SELECTION_TOOL_KEY));

        return button;
    }

    protected createMouseDeleteToolButton(): HTMLElement {
        const deleteToolButton = createIcon('chrome-close');
        deleteToolButton.title = 'Enable deletion tool';
        deleteToolButton.onclick = this.onClickStaticToolButton(deleteToolButton, MouseDeleteTool.ID);
        deleteToolButton.appendChild(this.createKeyboardShotcut(DELETION_TOOL_KEY));

        return deleteToolButton;
    }

    protected createMarqueeToolButton(): HTMLElement {
        const marqueeToolButton = createIcon('screen-full');
        marqueeToolButton.title = 'Enable marquee tool';
        marqueeToolButton.onclick = this.onClickStaticToolButton(marqueeToolButton, MarqueeMouseTool.ID);
        marqueeToolButton.appendChild(this.createKeyboardShotcut(MARQUEE_TOOL_KEY));

        return marqueeToolButton;
    }

    protected createValidateButton(): HTMLElement {
        const validateToolButton = createIcon('pass');
        validateToolButton.title = 'Validate model';
        validateToolButton.onclick = _event => {
            const modelIds: string[] = [this.modelRootId];
            this.actionDispatcher.dispatch(RequestMarkersAction.create(modelIds));
        };
        validateToolButton.appendChild(this.createKeyboardShotcut(VALIDATION_TOOL_KEY));

        return validateToolButton;
    }

    protected createSearchButton(): HTMLElement {
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

    protected createHeaderSearchField(): HTMLInputElement {
        const searchField = document.createElement('input');
        searchField.classList.add('search-input');
        searchField.tabIndex = 21;
        searchField.id = this.containerElement.id + '_search_field';
        searchField.type = 'text';
        searchField.placeholder = ' Search...';
        searchField.style.display = 'none';
        searchField.onkeyup = ev => {
            if (!(matchesKeystroke(ev, 'AltLeft') || matchesKeystroke(ev, 'AltRight'))) {
                ev.stopPropagation();
                this.requestFilterUpdate(this.searchField.value);
            }
        };
        searchField.onkeydown = ev => {
            if (!ev.altKey) {
                ev.stopPropagation();
                this.clearOnEscape(ev);
            }
        };

        return searchField;
    }

    protected createHeaderTitle(): HTMLElement {
        const header = document.createElement('div');
        header.classList.add('header-icon');
        header.appendChild(createIcon(PALETTE_ICON_ID));
        header.insertAdjacentText('beforeend', 'Palette');
        return header;
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

    protected createToolButton(item: PaletteItem, tabIndex: number, buttonIndex: number): HTMLElement {
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

    protected onClickCreateToolButton(button: HTMLElement, item: PaletteItem) {
        return (_ev: MouseEvent) => {
            if (!this.editorContext.isReadonly) {
                this.actionDispatcher.dispatchAll(item.actions);
                this.changeActiveButton(button);
                button.focus();
            }
        };
    }

    protected onClickStaticToolButton(button: HTMLElement, toolId?: string) {
        return (_ev: MouseEvent) => {
            if (!this.editorContext.isReadonly) {
                const action = toolId ? EnableToolsAction.create([toolId]) : EnableDefaultToolsAction.create();
                this.actionDispatcher.dispatch(action);
                this.changeActiveButton(button);
                button.focus();
            }
        };
    }

    changeActiveButton(button?: HTMLElement): void {
        if (this.lastActivebutton) {
            this.lastActivebutton.classList.remove(CLICKED_CSS_CLASS);
        }
        if (button) {
            button.classList.add(CLICKED_CSS_CLASS);
            this.lastActivebutton = button;
        } else {
            this.defaultToolsButton.classList.add(CLICKED_CSS_CLASS);
            this.lastActivebutton = this.defaultToolsButton;
        }
    }

    handle(action: Action): ICommand | Action | void {
        if (action.kind === EnableToolPaletteAction.KIND) {
            const requestAction = RequestContextActions.create({
                contextId: ToolPalette.ID,
                editorContext: {
                    selectedElementIds: []
                }
            });
            this.actionDispatcher.requestUntil(requestAction).then(response => {
                if (SetContextActions.is(response)) {
                    this.paletteItems = response.actions.map(e => e as PaletteItem);
                    this.actionDispatcher.dispatch(
                        SetUIExtensionVisibilityAction.create({ extensionId: ToolPalette.ID, visible: !this.editorContext.isReadonly })
                    );
                }
            });
        } else if (action.kind === EnableDefaultToolsAction.KIND) {
            this.changeActiveButton();
            this.restoreFocus();
        }
    }

    editModeChanged(_oldValue: string, _newValue: string): void {
        this.actionDispatcher.dispatch(
            SetUIExtensionVisibilityAction.create({ extensionId: ToolPalette.ID, visible: !this.editorContext.isReadonly })
        );
    }

    protected clickToolOnEnter(event: KeyboardEvent, button: HTMLElement, item: PaletteItem): void {
        if (matchesKeystroke(event, 'Enter')) {
            if (!this.editorContext.isReadonly) {
                this.actionDispatcher.dispatchAll(item.actions);
                this.changeActiveButton(button);
            }
        }
    }

    protected clearOnEscape(event: KeyboardEvent): void {
        if (matchesKeystroke(event, 'Escape')) {
            this.searchField.value = '';
            this.requestFilterUpdate('');
        }
    }

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
            this.actionDispatcher.dispatchAll(items[index].actions);
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

    protected clearToolOnEscape(event: KeyboardEvent): void {
        if (matchesKeystroke(event, 'Escape')) {
            if (event.target instanceof HTMLElement) {
                event.target.blur();
            }
            this.actionDispatcher.dispatch(EnableDefaultToolsAction.create());
        }
    }

    protected handleSetContextActions(action: SetContextActions): void {
        this.paletteItems = action.actions.map(e => e as PaletteItem);
        this.createBody();
    }

    protected requestFilterUpdate(filter: string): void {
        // Initialize the copy if it's empty
        if (this.paletteItemsCopy.length === 0) {
            // Creating deep copy
            this.paletteItemsCopy = JSON.parse(JSON.stringify(this.paletteItems));
        }

        // Reset the paletteItems before searching
        this.paletteItems = JSON.parse(JSON.stringify(this.paletteItemsCopy));
        // Filter the entries
        const filteredPaletteItems: PaletteItem[] = [];
        for (const itemGroup of this.paletteItems) {
            if (itemGroup.children) {
                // Fetch the labels according to the filter
                const matchingChildren = itemGroup.children.filter(child => child.label.toLowerCase().includes(filter.toLowerCase()));
                // Add the itemgroup containing the correct entries
                if (matchingChildren.length > 0) {
                    // Clear existing children
                    itemGroup.children.splice(0, itemGroup.children.length);
                    // Push the matching children
                    matchingChildren.forEach(child => itemGroup.children!.push(child));
                    filteredPaletteItems.push(itemGroup);
                }
            }
        }
        this.paletteItems = filteredPaletteItems;
        this.createBody();
    }
}

export function compare(a: PaletteItem, b: PaletteItem): number {
    const sortStringBased = a.sortString.localeCompare(b.sortString);
    if (sortStringBased !== 0) {
        return sortStringBased;
    }
    return a.label.localeCompare(b.label);
}

export function createIcon(codiconId: string): HTMLElement {
    const icon = document.createElement('i');
    icon.classList.add(...codiconCSSClasses(codiconId));
    return icon;
}

export function createToolGroup(item: PaletteItem): HTMLElement {
    const group = document.createElement('div');
    group.classList.add('tool-group');
    group.id = item.id;
    const header = document.createElement('div');
    header.classList.add('group-header');
    if (item.icon) {
        header.appendChild(createIcon(item.icon));
    }
    header.insertAdjacentText('beforeend', item.label);
    header.ondblclick = _ev => {
        const css = 'collapsed';
        changeCSSClass(group, css);
        Array.from(group.children).forEach(child => changeCSSClass(child, css));
        window!.getSelection()!.removeAllRanges();
    };

    group.appendChild(header);
    return group;
}

export function changeCSSClass(element: Element, css: string): void {
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    element.classList.contains(css) ? element.classList.remove(css) : element.classList.add(css);
}

export function changeCodiconClass(element: Element, codiconId: string): void {
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    element.classList.contains(codiconCSSClasses(codiconId)[1])
        ? element.classList.remove(codiconCSSClasses(codiconId)[1])
        : element.classList.add(codiconCSSClasses(codiconId)[1]);
}
