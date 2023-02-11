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
import { KeyListener, KeyTool, SModelElement, isSelectable } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';

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
    isEditMode = false;
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
                    .filter(e => isSelectable(e) && e.selected)
                    .filter(e => e.id !== e.root.id)
                    .map(e => e)
            );
            if (selectedElements.length > 0) {
                //   const selectedElement = selectedElements[0];
                // const bounds = isBoundsAware(selectedElement) ? selectedElement.bounds : { width: 0, height: 0, x: 0, y: 0 };

                if (matchesKeystroke(event, 'Digit1')) {
                    /*    console.log(bounds.width + ' ' + bounds.height);
                    const newBounds: ElementAndBounds = {
                        elementId: element.id,
                        newSize: {
                            width: bounds.width,
                            height: bounds.height
                        },
                        newPosition: {
                            x: bounds.x,
                            y: bounds.y
                        }
                    };

                    return ChangeBoundsOperation.create([newBounds]);**/
                } else if (matchesKeystroke(event, 'Digit2')) {
                    console.log('right right');
                } else if (matchesKeystroke(event, 'Digit3')) {
                    console.log('left bottom');
                } else if (matchesKeystroke(event, 'Digit4')) {
                    console.log('right bottom');
                }
            }
        }
        return [];
    }
}
