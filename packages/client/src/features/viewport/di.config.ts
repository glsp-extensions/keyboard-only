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
import { ContainerModule } from 'inversify';
import {
    CenterCommand,
    CenterKeyboardListener,
    configureActionHandler,
    configureCommand,
    EnableDefaultToolsAction,
    EnableToolsAction,
    FitToScreenCommand,
    GetViewportCommand,
    SetViewportCommand,
    ZoomMouseListener
} from 'sprotty';
import { MovementTool } from './movement-tool';
import { GLSPScrollMouseListener } from './glsp-scroll-mouse-listener';
import { RepositionCommand } from './reposition';
import { ZoomTool } from './zoom-tool';
import { TYPES } from '../../base/types';
import { SelectTool } from './select-tool';
import { RestoreViewportHandler } from './viewport-handler';
import { KeyboardGridCellSelectedAction, KeyboardGridKeyboardEventAction } from '../keyboard/interactions/grid/actions';

const glspViewportModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, CenterCommand);
    configureCommand({ bind, isBound }, FitToScreenCommand);
    configureCommand({ bind, isBound }, GetViewportCommand);
    configureCommand({ bind, isBound }, SetViewportCommand);
    bind(TYPES.KeyListener).to(CenterKeyboardListener);
    bind(TYPES.MouseListener).to(ZoomMouseListener);
    bind(GLSPScrollMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(GLSPScrollMouseListener);
    configureActionHandler({ bind, isBound }, EnableToolsAction.KIND, GLSPScrollMouseListener);
    configureActionHandler({ bind, isBound }, EnableDefaultToolsAction.KIND, GLSPScrollMouseListener);
    configureCommand({ bind, isBound }, RepositionCommand);
});

export const glspViewportInteractionsModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(TYPES.IDefaultTool).to(MovementTool);

    bind(ZoomTool).toSelf().inSingletonScope();
    bind(TYPES.IDefaultTool).toService(ZoomTool);

    bind(TYPES.IDefaultTool).to(SelectTool);

    bind(RestoreViewportHandler).toSelf().inSingletonScope();

    bind(TYPES.SModelRootListener).toService(ZoomTool);

    configureActionHandler({ bind, isBound }, EnableDefaultToolsAction.KIND, RestoreViewportHandler);
    configureActionHandler({ bind, isBound }, KeyboardGridCellSelectedAction.KIND, ZoomTool);
    configureActionHandler({ bind, isBound }, KeyboardGridKeyboardEventAction.KIND, ZoomTool);
});

export default glspViewportModule;
