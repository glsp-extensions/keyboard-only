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
import { Action, SelectAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { isSelectable, KeyListener, KeyTool, SModelElement, SRoutableElement, SwitchEditModeAction } from 'sprotty';
import { toArray } from 'sprotty/lib/utils/iterable';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { SResizeHandle } from '../change-bounds/model';

@injectable()
export class SelectTool implements GLSPTool {
    static ID = 'glsp.zoom-keyboard';

    isEditTool = true;

    protected selectKeyListener: SelectKeyListener = new SelectKeyListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;

    get id(): string {
        return SelectTool.ID;
    }

    enable(): void {
        this.keytool.register(this.selectKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.selectKeyListener);
    }
}

@injectable()
export class SelectKeyListener extends KeyListener {
    override keyDown(target: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'Escape')) {
            const isResizeHandleActive = toArray(target.root.index.all().filter(el => el instanceof SResizeHandle)).length > 0;

            if (isResizeHandleActive) {
                return [];
            }

            const deselect = toArray(target.root.index.all().filter(element => isSelectable(element) && element.selected));
            const results: Action[] = [];

            if (deselect.length > 0) {
                results.push(SelectAction.create({ deselectedElementsIDs: deselect.map(e => e.id) }));
            }

            const routableDeselect = deselect.filter(e => e instanceof SRoutableElement).map(e => e.id);
            if (routableDeselect.length > 0) {
                results.push(SwitchEditModeAction.create({ elementsToDeactivate: routableDeselect }));
            }

            return results;
        }
        return [];
    }
}
