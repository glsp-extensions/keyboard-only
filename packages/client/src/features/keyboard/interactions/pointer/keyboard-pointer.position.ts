/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
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

import { Point } from '@eclipse-glsp/protocol';
import { findChildrenAtPosition, findParentByFeature, SModelElement } from 'sprotty';
import { Containable, isContainable } from '../../../../features/hints/model';
import { getAbsolutePositionByPoint } from '../../../../utils/viewpoint-util';
import { KeyboardPointerUI } from './constants';
import { KeyboardPointer } from './keyboard-pointer';

export class KeyboardPointerPosition {
    public renderPosition: Point = { x: 20, y: 20 };

    constructor(protected readonly keyboardPointer: KeyboardPointer) {}

    get centerizedRenderPosition(): Point {
        return {
            x: this.renderPosition.x + KeyboardPointerUI.CIRCLE_WIDTH / 2,
            y: this.renderPosition.y + KeyboardPointerUI.CRICLE_HEIGHT / 2
        };
    }

    get diagramPosition(): Point {
        return getAbsolutePositionByPoint(this.keyboardPointer.root, this.centerizedRenderPosition);
    }

    childrenAtDiagramPosition(): SModelElement[] {
        const position = this.diagramPosition;

        return [this.keyboardPointer.root, ...findChildrenAtPosition(this.keyboardPointer.root, position)];
    }

    containableParentAtDiagramPosition(elementTypeId: string): {
        container: (SModelElement & Containable) | undefined;
        status: Status;
    } {
        const children = this.childrenAtDiagramPosition();

        return containableParentOf(children.reverse()[0], elementTypeId);
    }

    calcRelativeRenderPosition(x: number, y: number): Point {
        return {
            x: this.renderPosition.x + x,
            y: this.renderPosition.y + y
        };
    }
}

type Status = 'NODE_CREATION' | 'OPERATION_NOT_ALLOWED';

function containableParentOf(
    target: SModelElement,
    elementTypeId: string
): { container: (SModelElement & Containable) | undefined; status: Status } {
    const container = findParentByFeature(target, isContainable);
    return {
        container,
        status: isCreationAllowed(container, elementTypeId) ? 'NODE_CREATION' : 'OPERATION_NOT_ALLOWED'
    };
}

function isCreationAllowed(container: (SModelElement & Containable) | undefined, elementTypeId: string): boolean | undefined {
    return container && container.isContainableElement(elementTypeId);
}
