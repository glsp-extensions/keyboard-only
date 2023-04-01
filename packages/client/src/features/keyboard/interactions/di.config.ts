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
import { TriggerEdgeCreationAction, TriggerNodeCreationAction } from '@eclipse-glsp/protocol';
import { ContainerModule } from 'inversify';
import { configureActionHandler } from 'sprotty';
import { TYPES } from '../../../base/types';
import { SetEdgeTargetSelectionAction } from './edge-autocomplete/actions';
import { EdgeAutocompletePalette } from './edge-autocomplete/edge-autocomplete-palette';
import { EdgeAutocompletePaletteTool } from './edge-autocomplete/edge-autocomplete-tool';
import { GlobalKeyListenerTool } from '../global-keylistener-tool';
import { KeyboardGrid } from './grid/keyboard-grid';
import { KeyboardPointer } from './pointer/keyboard-pointer';
import { SetKeyboardPointerRenderPositionAction } from './pointer/actions';
import { GridSearchPalette } from './grid/grid-search-palette';
import { EnableKeyboardGridAction, KeyboardGridCellSelectedAction } from './grid/actions';
import { KeyboardNodeGrid } from './grid/keyboard-node-grid';

export const keyboardControlModule = new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(TYPES.IDefaultTool).to(GlobalKeyListenerTool);

    bind(KeyboardPointer).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardPointer);
    bind(TYPES.SModelRootListener).toService(KeyboardPointer);

    bind(KeyboardGrid).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardGrid);

    bind(KeyboardNodeGrid).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardNodeGrid);

    bind(EdgeAutocompletePalette).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(EdgeAutocompletePalette);

    bind(GridSearchPalette).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(GridSearchPalette);

    bind(TYPES.IDefaultTool).to(EdgeAutocompletePaletteTool);

    configureActionHandler({ bind, isBound }, EnableKeyboardGridAction.KIND, KeyboardGrid);

    configureActionHandler({ bind, isBound }, TriggerEdgeCreationAction.KIND, EdgeAutocompletePalette);
    configureActionHandler({ bind, isBound }, SetEdgeTargetSelectionAction.KIND, EdgeAutocompletePalette);

    configureActionHandler({ bind, isBound }, TriggerNodeCreationAction.KIND, KeyboardPointer);
    configureActionHandler({ bind, isBound }, KeyboardGridCellSelectedAction.KIND, KeyboardPointer);
    configureActionHandler({ bind, isBound }, SetKeyboardPointerRenderPositionAction.KIND, KeyboardPointer);
});
