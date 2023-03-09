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

import { injectable } from 'inversify';

@injectable()
export class KeyboardManagerService {
    protected token?: symbol;

    access(token: symbol): boolean {
        return this.token === undefined || this.token === token;
    }

    lock(token: symbol): boolean {
        if (this.access(token)) {
            this.token = token;
            return true;
        }

        return false;
    }

    unlock(token: symbol): boolean {
        if (this.token === token) {
            this.token = undefined;
            return true;
        }

        return false;
    }
}
