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
    options: HideToastAction.Options;
}

export namespace HideToastAction {
    export const KIND = 'hideToastMessageAction';

    export type Options = Pick<ToastOptions, 'id' | 'timeout'>;

    export function is(object: any): object is HideToastAction {
        return Action.hasKind(object, KIND);
    }

    export function create(options: Options): HideToastAction {
        return { kind: KIND, options };
    }
}

export interface ShowToastMessageAction extends Action {
    kind: typeof ShowToastMessageAction.KIND;
    options: ToastOptions;
}

export namespace ShowToastMessageAction {
    export const KIND = 'showToastMessageAction';

    export type CreateOptions = Partial<ToastOptions> & Required<Pick<ToastOptions, 'message'>>;

    export function is(object: any): object is ShowToastMessageAction {
        return Action.hasKind(object, KIND);
    }

    export function create(options: CreateOptions): ShowToastMessageAction {
        return { kind: KIND, options: { ...options, position: options.position ?? 'center', id: options.id ?? Symbol('toast id') } };
    }
}

export interface ToastOptions {
    id: symbol;
    timeout?: number;
    position: 'left' | 'center' | 'right';
    message: string;
}
@injectable()
export class Toast extends AbstractUIExtension implements IActionHandler {
    static readonly ID = 'toast';
    protected messages: { [key: symbol]: ToastOptions } = {};

    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: GLSPActionDispatcher;

    id(): string {
        return Toast.ID;
    }
    containerClass(): string {
        return Toast.ID;
    }

    protected initializeContents(_containerElement: HTMLElement): void {
        this.render();
    }

    handle(action: Action): ICommand | Action | void {
        if (EnableToastAction.is(action)) {
            this.actionDispatcher.dispatch(SetUIExtensionVisibilityAction.create({ extensionId: Toast.ID, visible: true }));
        } else if (ShowToastMessageAction.is(action)) {
            this.messages[action.options.id] = action.options;
            this.render();

            if (action.options.timeout) {
                setTimeout(() => {
                    this.delete(action.options.id);
                }, action.options.timeout);
            }
        } else if (HideToastAction.is(action)) {
            if (action.options.timeout) {
                setTimeout(() => {
                    this.delete(action.options.id);
                }, action.options.timeout);
            } else {
                this.delete(action.options.id);
            }
        }
    }

    protected render(): void {
        if (this.containerElement === undefined) {
            return;
        }

        this.containerElement.innerHTML = '';

        values(this.messages).forEach(message => {
            this.containerElement.appendChild(this.createToastMessage(message));
        });
    }

    protected delete(id: symbol): void {
        delete this.messages[id];
        this.render();
    }

    protected createToastMessage(option: ToastOptions): HTMLDivElement {
        const cell = document.createElement('div');
        cell.classList.add('toast-cell', `toast-column-${option.position}`);

        const container = document.createElement('div');
        container.classList.add('toast-container');

        const text = document.createElement('span');
        text.textContent = option.message;

        container.appendChild(text);
        cell.appendChild(container);

        return cell;
    }
}

function values(obj: { [key: symbol]: ToastOptions }): ToastOptions[] {
    return Object.getOwnPropertySymbols(obj).map(s => obj[s]);
}
