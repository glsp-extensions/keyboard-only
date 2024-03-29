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
import { ICommand, SetUIExtensionVisibilityAction } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { KeyboardPointer } from '../pointer/keyboard-pointer';
import { KeyboardPointerMetadata } from '../pointer/constants';
import { GridSearchPaletteMetadata } from './grid-search-palette';
import { KeyboardGrid } from './keyboard-grid';
import { Action } from '@eclipse-glsp/protocol';
import { KeyboardNodeGridMetadata } from './constants';

@injectable()
export class KeyboardNodeGrid extends KeyboardGrid {
    @inject(KeyboardPointer) protected readonly keyboardPointer: KeyboardPointer;

    protected override triggerActions = [SetUIExtensionVisibilityAction.create({ extensionId: KeyboardPointerMetadata.ID, visible: true })];
    protected override originId = KeyboardPointerMetadata.ID;

    override id(): string {
        return KeyboardNodeGridMetadata.ID;
    }

    override handle(action: Action): void | Action | ICommand {
        // Do nothing
    }

    protected override onKeyDown(event: KeyboardEvent): void {
        super.onKeyDown(event);
        this.showSearchOnEvent(event);

        if (this.keyboardPointer.isVisible) {
            this.keyboardPointer.keyListener.keyDown(event);
        }
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
}
