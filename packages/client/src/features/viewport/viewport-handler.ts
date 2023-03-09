/********************************************************************************
 * Copyright (c) 2023 EclipseSource and others.
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
import { EnableDefaultToolsAction, IActionHandler, ViewerOptions } from 'sprotty';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../base/types';

@injectable()
export class RestoreViewportHandler implements IActionHandler {
    @inject(TYPES.ViewerOptions) protected options: ViewerOptions;

    handle(action: Action): void | Action {
        if (EnableDefaultToolsAction.is(action)) {
            const container = document
                .getElementById(this.options.baseDiv)
                ?.querySelector('.sprotty-graph-container') as HTMLElement | null;
            container?.focus();
        }
    }
}
