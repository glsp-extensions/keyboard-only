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
import { LabeledAction, Action, CenterAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { SModelRoot } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { applyCssClasses, deleteCssClasses } from '../../tool-feedback/css-feedback';
import { toArray } from 'sprotty/lib/utils/iterable';
import {
    AutocompleteSuggestion,
    RevealEdgeElementAutocompleteSuggestionProvider,
    RevealNamedElementAutocompleteSuggestionProvider
} from '../autocomplete-suggestion-providers';
import { BaseAutocompletePalette } from '../base-autocomplete-palette';
import { isEqual } from 'lodash';

const CSS_SEARCH_HIDDEN = 'search-hidden';
const CSS_SEARCH_HIGHLIGHTED = 'search-highlighted';

@injectable()
export class SearchAutocompletePalette extends BaseAutocompletePalette {
    static readonly ID = 'search-autocomplete-palette';
    static readonly isInvokePaletteKey = (event: KeyboardEvent): boolean => matchesKeystroke(event, 'KeyF', 'ctrl');

    protected cachedSuggestions: AutocompleteSuggestion[] = [];

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

        console.log('Update Cacha');
        this.cachedSuggestions = suggestions;

        return suggestions.map(s => s.action);
    }

    protected override async visibleSuggestionsChanged(root: Readonly<SModelRoot>, labeledActions: LabeledAction[]): Promise<void> {
        await this.deleteCSS(root, CSS_SEARCH_HIDDEN);
        await this.applyCSS(this.getUnselectedSuggestionsFromLabeledActions(labeledActions), CSS_SEARCH_HIDDEN);
    }

    protected override async selectedSuggestionChanged(
        root: Readonly<SModelRoot>,
        labeledAction?: LabeledAction | undefined
    ): Promise<void> {
        await this.deleteCSS(root, CSS_SEARCH_HIGHLIGHTED);
        if (labeledAction !== undefined) {
            const suggestion = this.getSuggestionsFromLabeledActions([labeledAction]);

            const actions: Action[] = [];
            suggestion.map(currElem => actions.push(CenterAction.create([currElem.element.id], { animate: true, retainZoom: true })));

            this.actionDispatcher.dispatchAll(actions);
            await this.applyCSS(suggestion, CSS_SEARCH_HIGHLIGHTED);
        }
    }

    public override hide(): void {
        if (this.root !== undefined) {
            this.deleteCSS(this.root, CSS_SEARCH_HIDDEN);
            this.deleteCSS(this.root, CSS_SEARCH_HIGHLIGHTED);
        }

        super.hide();
    }

    protected applyCSS(suggestions: AutocompleteSuggestion[], cssClass: string): Promise<void> {
        const actions = suggestions.map(suggestion => applyCssClasses(suggestion.element, cssClass));
        return this.actionDispatcher.dispatchAll(actions);
    }

    protected deleteCSS(root: Readonly<SModelRoot>, cssClass: string): Promise<void> {
        const actions = toArray(root.index.all().map(element => deleteCssClasses(element, cssClass)));
        return this.actionDispatcher.dispatchAll(actions);
    }

    protected getSuggestionsFromLabeledActions(labeledActions: LabeledAction[]): AutocompleteSuggestion[] {
        return this.cachedSuggestions.filter(c => labeledActions.find(s => isEqual(s, c.action)));
    }

    protected getUnselectedSuggestionsFromLabeledActions(labeledActions: LabeledAction[]): AutocompleteSuggestion[] {
        return this.cachedSuggestions.filter(c => !labeledActions.find(s => isEqual(s, c.action)));
    }
}
