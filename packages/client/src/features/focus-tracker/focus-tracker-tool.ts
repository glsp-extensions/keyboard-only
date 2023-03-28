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

import { injectable, inject } from 'inversify';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { ShowToastMessageAction } from '../toast/toast';
import * as messages from '../toast/messages.json';
import { TYPES } from '../../base/types';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';

@injectable()
export class FocusTrackerTool implements GLSPTool {
    static ID = 'glsp.focus-tracker';

    isEditTool = true;
    @inject(TYPES.IActionDispatcher)
    protected actionDispatcher: GLSPActionDispatcher;

    protected readonly focusInFunction = (event: FocusEvent): Promise<void> => this.focusIn(event);
    protected readonly focusOutFunction = (event: FocusEvent): Promise<void> => this.focusOut(event);

    get id(): string {
        return FocusTrackerTool.ID;
    }

    enable(): void {
        document.addEventListener('focusin', this.focusInFunction);
        document.addEventListener('focusout', this.focusOutFunction);
    }

    disable(): void {
        document.removeEventListener('focusin', this.focusInFunction);
        document.removeEventListener('focusout', this.focusOutFunction);
    }

    protected async focusOut(event: FocusEvent): Promise<void> {
        await this.showToast('Focus not set');
    }

    protected async focusIn(event: FocusEvent): Promise<void> {
        let message: string | undefined;
        const target = event.target;

        if (target instanceof HTMLElement) {
            // eslint-disable-next-line no-null/no-null
            if (target.ariaLabel !== null) {
                message = this.handleAriaLabel(target);
            } else {
                message = this.handleTextNode(target);
            }
        }

        await this.showToast(message);
    }

    protected handleTextNode(target: HTMLElement): string | undefined {
        const textNode = Array.prototype.filter
            .call(target.childNodes, element => element.nodeType === Node.TEXT_NODE)
            .map(element => element.textContent)
            .join('');

        if (textNode.trim().length !== 0) {
            console.log('Focus with text content ', textNode);
            return textNode;
        }

        return undefined;
    }

    protected handleAriaLabel(target: HTMLElement): string | undefined {
        console.log('Focus of target with aria label ', target.ariaLabel);

        // eslint-disable-next-line no-null/no-null
        return target.ariaLabel === null ? undefined : target.ariaLabel;
    }

    protected showToast(message?: string): Promise<void> {
        return this.actionDispatcher.dispatchAll([
            ShowToastMessageAction.create({
                id: Symbol.for(FocusTrackerTool.ID),
                message: `${messages.focus.focus_on} ${message ?? 'unknown'}`,
                position: 'left'
            })
        ]);
    }
}
