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
import { Action, LabeledAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { AbstractUIExtension, IActionDispatcherProvider, SModelRoot, TYPES, ViewerOptions, SetUIExtensionVisibilityAction } from 'sprotty';
import { DOMHelper } from 'sprotty/lib/base/views/dom-helper';
import { KeyCode, matchesKeystroke } from 'sprotty/lib/utils/keyboard';

import { toActionArray } from '../../base/auto-complete/auto-complete-widget';
import { SModelRootListener } from '../../base/model/update-model-command';
import '../../../css/keyboard.css';
import { KeyboardMouse } from './keyboard-mouse';
import { SetKeyboardMouseAction } from './actions';

@injectable()
export class KeyboardGrid extends AbstractUIExtension implements SModelRootListener {
    static readonly ID = 'keyboard-grid';
    protected root: Readonly<SModelRoot>;

    @inject(TYPES.IActionDispatcherProvider) protected actionDispatcherProvider: IActionDispatcherProvider;
    @inject(TYPES.ViewerOptions) protected viewerOptions: ViewerOptions;
    @inject(TYPES.DOMHelper) protected domHelper: DOMHelper;

    id(): string {
        return KeyboardGrid.ID;
    }

    containerClass(): string {
        return KeyboardGrid.ID;
    }

    protected initializeContents(containerElement: HTMLElement): void {
        this.containerElement.tabIndex = 21;
        containerElement.style.position = 'absolute';
        containerElement.style.width = '100%';
        containerElement.style.height = '100%';
        containerElement.style.border = 'none';
        containerElement.classList.add('grid-container');

        for (let i = 0; i < 9; i++) {
            const spanIndex = document.createElement('span');
            const gridItem = document.createElement('div');

            gridItem.classList.add('grid-item');
            gridItem.id = `keyboard-grid-item-${i}`;
            spanIndex.classList.add('numberCircleGrid');
            spanIndex.innerHTML = i.toString();

            gridItem.appendChild(spanIndex);
            containerElement.appendChild(gridItem);
        }

        this.containerElement.onkeydown = ev => {
            this.activateGridCellEvent(ev);
            this.hideIfEscapeEvent(ev);
        };
    }

    override show(root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        super.show(root, ...contextElementIds);
        this.containerElement.focus();
    }

    protected override onBeforeShow(containerElement: HTMLElement, root: Readonly<SModelRoot>, ...selectedElementIds: string[]): void {
        this.root = root;
    }

    modelRootChanged(root: Readonly<SModelRoot>): void {
        this.root = root;
    }

    protected hideIfEscapeEvent(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'Escape')) {
            this.hide();
        }
    }

    protected activateGridCellEvent(event: KeyboardEvent): any {
        let index: number | undefined = undefined;
        for (let i = 0; i < 9; i++) {
            if (matchesKeystroke(event, ('Digit' + i) as KeyCode)) {
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            this.positionKeyboardMouseInGrid(index);
        }
    }

    // https://www.delftstack.com/howto/javascript/get-position-of-element-in-javascript/
    protected getOffset(el: any): { top: number; left: number } {
        let _x = 0;
        let _y = 0;
        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        return { top: _y, left: _x };
    }

    protected getCenterOfCell(cell: HTMLElement): number[] {
        const cellLeft = this.getOffset(cell).left;
        const cellTop = this.getOffset(cell).top;
        const cellWidth = cell.offsetWidth;
        const cellHeight = cell.offsetHeight;

        const newCellWidth = cellWidth / 2;
        const newCellHeight = cellHeight / 2;

        return [cellLeft + newCellWidth, cellTop + newCellHeight];
    }
    protected positionKeyboardMouseInGrid(index: number): void {
        let x = 0;
        let y = 0;

        const activeGridCell = document.getElementById(`keyboard-grid-item-${index}`);
        // eslint-disable-next-line no-null/no-null
        if (activeGridCell !== null) {
            const positions = this.getCenterOfCell(activeGridCell);
            x = positions[0];
            y = positions[1];
        }

        this.executeAction([
            SetUIExtensionVisibilityAction.create({ extensionId: KeyboardMouse.ID, visible: true, contextElementsId: [] }),
            SetKeyboardMouseAction.create(x, y)
        ]);

        // TODO Hide or Not?
        // this.hide();
    }
    protected executeAction(input: LabeledAction | Action[] | Action): void {
        this.actionDispatcherProvider()
            .then(actionDispatcher => actionDispatcher.dispatchAll(toActionArray(input)))
            .catch(reason => this.logger.error(this, 'No action dispatcher available to execute grid action', reason));
    }
}
