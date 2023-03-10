/********************************************************************************
 * Copyright (c) 2021-2022 EclipseSource and others.
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
import { KeyListener, KeyTool, SModelElement } from 'sprotty';
import { BaseGLSPTool } from '../tools/base-glsp-tool';
import { EnableCheatSheetShortcutAction, SetCheatSheetKeyShortcutAction } from './cheat-sheet';

@injectable()
export class CheatSheetTool extends BaseGLSPTool {
    static ID = 'cheatSheetTool';

    @inject(KeyTool) protected readonly keytool: KeyTool;

    protected cheatSheetKeyListener: CheatSheetKeyListener;

    get id(): string {
        return CheatSheetTool.ID;
    }

    enable(): void {
        this.keytool.register(this.cheatSheetKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.cheatSheetKeyListener);
    }
}

export class CheatSheetKeyListener extends KeyListener {
    protected readonly token = Symbol(CheatSheetKeyListener.name);
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (event.key === '?') {
            console.log('?');
            // TODO: Remove set- only for debugging
            return [
                EnableCheatSheetShortcutAction.create(),
                SetCheatSheetKeyShortcutAction.create(this.token, [
                    {
                        shortcuts: ['Ctrl', 'C'],
                        description: 'Copy'
                    },
                    {
                        shortcuts: ['C'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    },
                    {
                        shortcuts: ['C', 'Alt', 'Ctrl'],
                        description: 'Test Test Test'
                    }
                ])
            ];
        }
        return [];
    }
}
