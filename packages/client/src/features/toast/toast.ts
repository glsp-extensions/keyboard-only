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
import { injectable, inject } from 'inversify';
import { AbstractUIExtension, IActionHandler, ICommand, SetUIExtensionVisibilityAction, TYPES } from 'sprotty';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';

export interface EnableToastAction extends Action {
    kind: typeof EnableToastAction.KIND;
}

export namespace EnableToastAction {
    export const KIND = 'enableToastAction';

    export function is(object: any): object is EnableToastAction {
        return Action.hasKind(object, KIND);
    }

    export function create(): EnableToastAction {
        return { kind: KIND };
    }
}

export interface HideToastAction extends Action {
    kind: typeof HideToastAction.KIND;
}

export namespace HideToastAction {
    export const KIND = 'hideToastMessageAction';

    export function is(object: any): object is HideToastAction {
        return Action.hasKind(object, KIND);
    }

    export function create(): HideToastAction {
        return { kind: KIND };
    }
}

export interface ShowToastMessageAction extends Action {
    kind: typeof ShowToastMessageAction.KIND;
    message: string;
}

export namespace ShowToastMessageAction {
    export const KIND = 'showToastMessageAction';

    export function is(object: any): object is ShowToastMessageAction {
        return Action.hasKind(object, KIND);
    }

    export function create(message: string): ShowToastMessageAction {
        return { kind: KIND, message };
    }
}

@injectable()
export class Toast extends AbstractUIExtension implements IActionHandler {
    static readonly ID = 'toast';
    protected container: HTMLDivElement;
    protected text: HTMLSpanElement;

    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: GLSPActionDispatcher;

    id(): string {
        return Toast.ID;
    }
    containerClass(): string {
        return Toast.ID;
    }

    protected initializeContents(_containerElement: HTMLElement): void {
        this.text = document.createElement('span');
        this.container = document.createElement('div');
        this.container.classList.add('toast-container');

        this.container.appendChild(this.text);
        _containerElement.appendChild(this.container);
    }

    handle(action: Action): ICommand | Action | void {
        if (EnableToastAction.is(action)) {
            this.actionDispatcher.dispatch(SetUIExtensionVisibilityAction.create({ extensionId: Toast.ID, visible: true }));
        } else if (ShowToastMessageAction.is(action)) {
            this.text.textContent = action.message;
            this.container.style.visibility = 'visible';
        } else if (HideToastAction.is(action)) {
            this.text.textContent = '';
            this.container.style.visibility = 'hidden';
        }
    }
}
