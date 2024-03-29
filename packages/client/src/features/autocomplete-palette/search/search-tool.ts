/********************************************************************************
 * Copyright (c) 2020 EclipseSource and others.
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
import { inject, injectable } from 'inversify';
import { KeyTool, Tool } from 'sprotty';
import { SearchAutocompletePaletteKeyListener } from './search-keylistener';
import { GLSPActionDispatcher } from '../../../base/action-dispatcher';
import { TYPES } from '../../../base/types';

@injectable()
export class SearchAutocompletePaletteTool implements Tool {
    static readonly ID = 'glsp.search-autocomplete-palette-tool';

    protected readonly keyListener = new SearchAutocompletePaletteKeyListener(this);
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher: GLSPActionDispatcher;

    @inject(KeyTool) protected keyTool: KeyTool;

    get id(): string {
        return SearchAutocompletePaletteTool.ID;
    }

    enable(): void {
        this.keyTool.register(this.keyListener);
        this.keyListener.registerShortcutKey();
    }

    disable(): void {
        this.keyTool.deregister(this.keyListener);
    }
}
