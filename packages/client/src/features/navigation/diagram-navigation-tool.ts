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
import { inject, injectable, optional } from 'inversify';
import { KeyListener, KeyTool, ISnapper } from 'sprotty';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { TYPES } from '../../base/types';

@injectable()
export class DiagramNavigationTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;

    protected diagramNavigationKeyListener: DiagramNavigationListener = new DiagramNavigationListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(TYPES.ISnapper) @optional() readonly snapper?: ISnapper;
    get id(): string {
        return DiagramNavigationTool.ID;
    }

    enable(): void {
        this.keytool.register(this.diagramNavigationKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.diagramNavigationKeyListener);
    }
}

@injectable()
export class DiagramNavigationListener extends KeyListener {}
