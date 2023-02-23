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
import { configureActionHandler, EnableDefaultToolsAction } from 'sprotty';
import '../../../css/tool-palette.css';
import { TYPES } from '../../base/types';

import { EnableToolPaletteAction } from '../tool-palette/tool-palette';
import { KeyboardToolPalette } from './tool-palette/keyboard-tool-palette';

const keyboardToolPaletteModule = new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(KeyboardToolPalette).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(KeyboardToolPalette);
    configureActionHandler({ bind, isBound }, EnableToolPaletteAction.KIND, KeyboardToolPalette);
    configureActionHandler({ bind, isBound }, EnableDefaultToolsAction.KIND, KeyboardToolPalette);
});

export default keyboardToolPaletteModule;
