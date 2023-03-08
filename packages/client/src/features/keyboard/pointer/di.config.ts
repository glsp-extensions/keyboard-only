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
import { TriggerNodeCreationAction } from '@eclipse-glsp/protocol';
import { ContainerModule } from 'inversify';
import { configureActionHandler } from 'sprotty';

import { TYPES } from '../../../base/types';
import { GlobalKeyListenerTool } from './../global-keylistener-tool';
import { KeyboardGrid } from './../grid/keyboard-grid';
import { SetKeyboardPointerRenderPositionAction } from './../pointer/actions';
import { KeyboardPointer } from './../pointer/keyboard-pointer';

export const keyboardControlModule = new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(TYPES.IDefaultTool).to(GlobalKeyListenerTool);

    bind(KeyboardPointer).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardPointer);
    bind(TYPES.SModelRootListener).toService(KeyboardPointer);

    bind(KeyboardGrid).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardGrid);

    configureActionHandler({ bind, isBound }, TriggerNodeCreationAction.KIND, KeyboardPointer);
    configureActionHandler({ bind, isBound }, SetKeyboardPointerRenderPositionAction.KIND, KeyboardPointer);
});
