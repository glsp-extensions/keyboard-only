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
import { Action, hasNumberProp, hasStringProp } from '@eclipse-glsp/protocol';

export interface FocusDomAction extends Action {
    kind: typeof FocusDomAction.KIND;
    id: string;
}

export interface SetKeyboardMouseAction extends Action {
    kind: typeof SetKeyboardMouseAction.KIND;
    x: number;
    y: number;
}

export namespace FocusDomAction {
    export const KIND = 'focusDomAction';

    export function is(object: any): object is FocusDomAction {
        return Action.hasKind(object, KIND) && hasStringProp(object, 'id');
    }

    export function create(id: string): FocusDomAction {
        return { kind: KIND, id };
    }
}

export namespace SetKeyboardMouseAction {
    export const KIND = 'setKeyboardMouseAction';

    export function is(object: any): object is SetKeyboardMouseAction {
        return Action.hasKind(object, KIND) && hasNumberProp(object, 'x') && hasNumberProp(object, 'y');
    }

    export function create(x: number, y: number): SetKeyboardMouseAction {
        return { kind: KIND, x: x, y: y };
    }
}
