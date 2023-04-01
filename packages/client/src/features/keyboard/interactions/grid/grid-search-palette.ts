/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
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
import '../../../../../css/keyboard.css';

import { injectable } from 'inversify';
import { SearchAutocompletePalette } from '../../../autocomplete-palette/search/search-palette';
import {
    IAutocompleteSuggestionProvider,
    RevealEdgeElementAutocompleteSuggestionProvider,
    RevealNamedElementAutocompleteSuggestionProvider
} from '../../../autocomplete-palette/autocomplete-suggestion-providers';
import { SEdge, SetUIExtensionVisibilityAction, SModelElement, SModelRoot } from 'sprotty';
import { Action } from '@eclipse-glsp/protocol';
import { KeyboardNodeGridMetadata } from './constants';

export namespace GridSearchPaletteMetadata {
    export const ID = 'grid-search-palette';
}

@injectable()
export class GridSearchPalette extends SearchAutocompletePalette {
    override id(): string {
        return GridSearchPaletteMetadata.ID;
    }

    protected override getSuggestionProviders(root: Readonly<SModelRoot>, input: string): IAutocompleteSuggestionProvider[] {
        return [new GridRevealNamedElementSuggestionProvider(), new GridRevealEdgeSuggestionProvider()];
    }
}

export class GridRevealEdgeSuggestionProvider extends RevealEdgeElementAutocompleteSuggestionProvider {
    protected override getActions(edge: SEdge): Action[] {
        return [
            ...super.getActions(edge),
            SetUIExtensionVisibilityAction.create({
                extensionId: KeyboardNodeGridMetadata.ID,
                visible: true
            })
        ];
    }
}
export class GridRevealNamedElementSuggestionProvider extends RevealNamedElementAutocompleteSuggestionProvider {
    protected override getActions(nameable: SModelElement): Action[] {
        return [
            ...super.getActions(nameable),
            SetUIExtensionVisibilityAction.create({
                extensionId: KeyboardNodeGridMetadata.ID,
                visible: true
            })
        ];
    }
}
