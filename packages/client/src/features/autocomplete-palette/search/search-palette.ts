/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
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
import { Action, LabeledAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { SModelRoot } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { applyCssClasses } from '../../tool-feedback/css-feedback';

import {
    AutocompleteSuggestion,
    RevealEdgeElementAutocompleteSuggestionProvider,
    RevealNamedElementAutocompleteSuggestionProvider
} from '../autocomplete-suggestion-providers';
import { BaseAutocompletePalette } from '../base-autocomplete-palette';

@injectable()
export class SearchAutocompletePalette extends BaseAutocompletePalette {
    static readonly ID = 'search-autocomplete-palette';
    static readonly isInvokePaletteKey = (event: KeyboardEvent): boolean => matchesKeystroke(event, 'KeyF', 'ctrl');

    @inject(RevealNamedElementAutocompleteSuggestionProvider)
    protected readonly revealNamedElementSuggestions: RevealNamedElementAutocompleteSuggestionProvider;

    @inject(RevealEdgeElementAutocompleteSuggestionProvider)
    protected readonly revealNamedEdgeSuggestions: RevealEdgeElementAutocompleteSuggestionProvider;

    id(): string {
        return SearchAutocompletePalette.ID;
    }

    protected override initializeContents(containerElement: HTMLElement): void {
        super.initializeContents(containerElement);

        this.autocompleteWidget.inputField.placeholder = 'Search for elements';
    }

    protected async retrieveSuggestions(root: Readonly<SModelRoot>, input: string): Promise<LabeledAction[]> {
        const providers = [this.revealNamedElementSuggestions, this.revealNamedEdgeSuggestions];
        const suggestions = (await Promise.all(providers.map(provider => provider.retrieveSuggestions(root, input)))).flat(1);

        this.applyCSS(suggestions);

        return suggestions.map(s => s.action);
    }

    protected applyCSS(suggestions: AutocompleteSuggestion[]): void {
        const actions = suggestions.map(suggestion => applyCssClasses(suggestion.element, 'search-outline'));

        this.actionDispatcher.dispatchAll(actions);
    }
}
