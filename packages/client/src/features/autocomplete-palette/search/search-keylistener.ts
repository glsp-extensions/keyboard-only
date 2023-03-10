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
import { Action } from '@eclipse-glsp/protocol';
import { KeyListener, SetUIExtensionVisibilityAction, SModelElement } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { CheatSheetKeyShortcutProvider, SetCheatSheetKeyShortcutAction } from '../../cheat-sheet/cheat-sheet';
import { SearchAutocompletePalette } from './search-palette';
import { SearchAutocompletePaletteTool } from './search-tool';

export class SearchAutocompletePaletteKeyListener extends KeyListener implements CheatSheetKeyShortcutProvider {
    constructor(protected readonly tool: SearchAutocompletePaletteTool) {
        super();
    }
    registerShortcutKey(): void {
        this.tool.actionDispatcher.onceModelInitialized().then(() => {
            this.tool.actionDispatcher.dispatchAll([
                SetCheatSheetKeyShortcutAction.create(Symbol('search-mode'), [
                    { shortcuts: ['CTRL', 'F'], description: 'Activate search for elements' }
                ])
            ]);
        });
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'Escape')) {
            return [
                SetUIExtensionVisibilityAction.create({ extensionId: SearchAutocompletePalette.ID, visible: false, contextElementsId: [] })
            ];
        } else if (SearchAutocompletePalette.isInvokePaletteKey(event)) {
            return [
                SetUIExtensionVisibilityAction.create({
                    extensionId: SearchAutocompletePalette.ID,
                    visible: true
                })
            ];
        }
        return [];
    }
}
