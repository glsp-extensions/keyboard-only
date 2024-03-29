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
import { ContainerModule } from 'inversify';
import { configureActionHandler } from 'sprotty';
import { TYPES } from '../../base/types';
import { CheatSheet, EnableCheatSheetShortcutAction, SetCheatSheetKeyShortcutAction } from './cheat-sheet';
import '../../../css/cheat-sheet.css';
import { CheatSheetTool } from './cheat-sheet-tool';

const cheatSheetModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(CheatSheet).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(CheatSheet);
    bind(TYPES.IDefaultTool).to(CheatSheetTool);
    configureActionHandler({ bind, isBound }, EnableCheatSheetShortcutAction.KIND, CheatSheet);
    configureActionHandler({ bind, isBound }, SetCheatSheetKeyShortcutAction.KIND, CheatSheet);
});

export default cheatSheetModule;
