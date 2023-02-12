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
import { inject, injectable } from 'inversify';
import { KeyListener, KeyTool, SModelElement, findParentByFeature, isSelected, isBoundsAware, isSelectable, BoundsAware } from 'sprotty';
import { isBoundsAwareMoveable, isResizable } from '../change-bounds/model';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';

enum EDGE {
    TOP_RIGHT,
    TOP_LEFT,
    BOTTOM_RIGHT,
    BOTTOM_LEFT
}
@injectable()
export class ResizeTool implements GLSPTool {
    static ID = 'glsp.resize-keyboard';

    isEditTool = true;

    protected resizeKeyListener: ResizeKeyListener = new ResizeKeyListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;

    get id(): string {
        return ResizeTool.ID;
    }

    enable(): void {
        this.keytool.register(this.resizeKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.resizeKeyListener);
    }
}

@injectable()
export class ResizeKeyListener extends KeyListener {
    protected activeResizeElement?: SModelElement;
    isEditMode = false;
    activeEdge: EDGE | undefined = undefined;
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'KeyR', 'alt')) {
            console.log('welcome to resize part via key');
            this.isEditMode = true;
            // TODO: mark selected node to state that node is in edit mode
        }
        if (this.isEditMode) {
            const selectedElements = Array.from(
                element.root.index
                    .all()
                    .filter(e => isSelectable(e) && isBoundsAware(e) && isResizable(e) && e.selected)
                    .filter(e => e.id !== e.root.id)
                    .map(e => e) as (SModelElement & BoundsAware)[]
            );

            /* if (this.activeResizeElement) {
                if (selectedElements.includes(this.activeResizeElement.id)) {
                    // our active element is still selected, nothing to do
                    console.log('');
                }*/

            this.setActiveResizeElement(selectedElements[0]);
            if (matchesKeystroke(event, 'Digit1')) {
                console.log('right top');
                this.activeEdge = EDGE.TOP_RIGHT;
            } else if (matchesKeystroke(event, 'Digit2')) {
                console.log('left top');
                this.activeEdge = EDGE.TOP_LEFT;
            } else if (matchesKeystroke(event, 'Digit3')) {
                console.log('left bottom');
                this.activeEdge = EDGE.BOTTOM_LEFT;
            } else if (matchesKeystroke(event, 'Digit4')) {
                console.log('right bottom');
                this.activeEdge = EDGE.BOTTOM_RIGHT;
            }
        }
        return [];
    }
    protected setActiveResizeElement(target: SModelElement): boolean {
        // check if we have a selected, moveable element (multi-selection allowed)
        const moveableElement = findParentByFeature(target, isBoundsAwareMoveable);
        if (isSelected(moveableElement)) {
            // only allow one element to have the element resize handles
            this.activeResizeElement = moveableElement;
            if (isResizable(this.activeResizeElement)) {
                console.log('element resizable');
                // this.tool.dispatchFeedback([ShowChangeBoundsToolResizeFeedbackAction.create(this.activeResizeElement.id)], this);
            }
            return true;
        }
        return false;
    }
}
