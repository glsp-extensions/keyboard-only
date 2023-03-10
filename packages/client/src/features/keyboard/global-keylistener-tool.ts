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
import { IActionDispatcher, SetUIExtensionVisibilityAction, TYPES } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { ToolPalette } from '../tool-palette/tool-palette';
import { FocusDomAction } from './actions';
import { KeyboardGridUI } from './interactions/grid/constants';
import { KeyboardPointerUI } from './interactions/pointer/constants';

@injectable()
export class GlobalKeyListenerTool implements GLSPTool {
    static ID = 'glsp.global-key-listener';

    isEditTool = false;

    get id(): string {
        return GlobalKeyListenerTool.ID;
    }

    @inject(TYPES.IActionDispatcher) protected actionDispatcher: IActionDispatcher;

    protected readonly keyListener = new KeyboardListener();

    enable(): void {
        document.addEventListener('keydown', this.keydown.bind(this));
    }
    disable(): void {
        document.removeEventListener('keydown', this.keydown.bind(this));
    }

    keydown(event: KeyboardEvent): void {
        this.actionDispatcher.dispatchAll(this.keyListener.keyDown(event));
    }
}

export class KeyboardListener {
    keyDown(event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'KeyP', 'alt')) {
            return [FocusDomAction.create(ToolPalette.ID)];
        } else if (matchesKeystroke(event, 'Escape')) {
            return [
                SetUIExtensionVisibilityAction.create({ extensionId: KeyboardPointerUI.ID, visible: false, contextElementsId: [] }),
                SetUIExtensionVisibilityAction.create({ extensionId: KeyboardGridUI.ID, visible: false, contextElementsId: [] })
            ];
        }
        return [];
    }
}
