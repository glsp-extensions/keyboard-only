/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
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
import '../../../../../css/keyboard.css';

import { inject, injectable } from 'inversify';
import { AbstractUIExtension, ActionDispatcher, SetUIExtensionVisibilityAction, SModelRoot, TYPES } from 'sprotty';
import { KeyCode, matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { SetKeyboardPointerRenderPositionAction } from '../pointer/actions';
import { KeyboardPointer } from '../pointer/keyboard-pointer';
import { KeyboardPointerUI } from '../pointer/constants';
import { KeyboardGridUI } from './constants';
import { GridSearchPaletteMetadata } from './grid-search-palette';

@injectable()
export class KeyboardGrid extends AbstractUIExtension {
    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: ActionDispatcher;
    @inject(KeyboardPointer) protected readonly keyboardPointer: KeyboardPointer;

    id(): string {
        return KeyboardGridUI.ID;
    }

    containerClass(): string {
        return KeyboardGridUI.ID;
    }

    protected initializeContents(containerElement: HTMLElement): void {
        console.log('Init');
        containerElement.tabIndex = KeyboardGridUI.TAB_INDEX;
        containerElement.classList.add('grid-container');
        containerElement.setAttribute('aria-label', 'Grid');

        for (let i = 1; i <= 9; i++) {
            const gridNumber = document.createElement('div');
            const gridItem = document.createElement('div');

            gridItem.classList.add('grid-item');
            gridItem.id = `keyboard-grid-item-${i}`;

            gridNumber.classList.add('grid-item-number');
            gridNumber.innerHTML = i.toString();

            gridItem.appendChild(gridNumber);
            containerElement.appendChild(gridItem);
        }

        this.containerElement.onkeydown = ev => {
            this.activateCellIfDigitEvent(ev);
            this.hideIfEscapeEvent(ev);
            this.showSearchOnEvent(ev);

            if (this.keyboardPointer.isVisible) {
                this.keyboardPointer.keyListener.keyDown(ev);
            }
        };
    }

    protected showSearchOnEvent(event: KeyboardEvent): void {
        if (matchesKeystroke(event, 'KeyF', 'ctrl')) {
            event.preventDefault();
            this.actionDispatcher.dispatch(
                SetUIExtensionVisibilityAction.create({
                    extensionId: GridSearchPaletteMetadata.ID,
                    visible: true
                })
            );
            this.hide();
        }
    }
    protected override setContainerVisible(visible: boolean): void {
        if (this.containerElement) {
            if (visible) {
                this.containerElement.style.visibility = 'visible';
                this.containerElement.style.opacity = '0.7';
            } else {
                this.containerElement.style.visibility = 'hidden';
                this.containerElement.style.opacity = '0';
            }
        }
    }

    override show(root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        super.show(root, ...contextElementIds);
        this.containerElement.focus();
    }

    protected hideIfEscapeEvent(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'Escape')) {
            this.hide();
        }
    }

    protected activateCellIfDigitEvent(event: KeyboardEvent): any {
        let index: number | undefined = undefined;

        for (let i = 1; i <= 9; i++) {
            if (matchesKeystroke(event, ('Digit' + i) as KeyCode)) {
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            this.keyboardPointerPositionInGrid(index);
        }
    }

    protected keyboardPointerPositionInGrid(index: number): void {
        let x = 0;
        let y = 0;

        const activeGridCell = document.getElementById(`keyboard-grid-item-${index}`);
        // eslint-disable-next-line no-null/no-null
        if (activeGridCell !== null) {
            const positions = getCenterOfCell(activeGridCell);
            x = positions[0];
            y = positions[1];
        }

        this.actionDispatcher.dispatchAll([
            SetUIExtensionVisibilityAction.create({ extensionId: KeyboardPointerUI.ID, visible: true }),
            SetKeyboardPointerRenderPositionAction.create(x, y)
        ]);
    }
}

// https://www.delftstack.com/howto/javascript/get-position-of-element-in-javascript/
function getOffset(el: any): { top: number; left: number } {
    let _x = 0;
    let _y = 0;
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

function getCenterOfCell(cell: HTMLElement): number[] {
    const cellLeft = getOffset(cell).left;
    const cellTop = getOffset(cell).top;
    const cellWidth = cell.offsetWidth;
    const cellHeight = cell.offsetHeight;

    const newCellWidth = cellWidth / 2;
    const newCellHeight = cellHeight / 2;

    return [cellLeft + newCellWidth, cellTop + newCellHeight];
}
