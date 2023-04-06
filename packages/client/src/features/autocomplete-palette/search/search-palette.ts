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
import { LabeledAction } from '@eclipse-glsp/protocol';
import { injectable } from 'inversify';
import { SEdge, SModelElement, SModelRoot, SNode } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { applyCssClasses, deleteCssClasses } from '../../tool-feedback/css-feedback';
import { toArray } from 'sprotty/lib/utils/iterable';
import {
    AutocompleteSuggestion,
    IAutocompleteSuggestionProvider,
    RevealEdgeElementAutocompleteSuggestionProvider,
    RevealNamedElementAutocompleteSuggestionProvider
} from '../autocomplete-suggestion-providers';
import { BaseAutocompletePalette } from '../base-autocomplete-palette';
import { isEqual } from 'lodash';
import { RepositionAction } from '../../viewport/reposition';

const CSS_SEARCH_HIDDEN = 'search-hidden';
const CSS_SEARCH_HIGHLIGHTED = 'search-highlighted';

@injectable()
export class SearchAutocompletePalette extends BaseAutocompletePalette {
    static readonly ID = 'search-autocomplete-palette';
    static readonly isInvokePaletteKey = (event: KeyboardEvent): boolean => matchesKeystroke(event, 'KeyF', 'ctrl');

    protected cachedSuggestions: AutocompleteSuggestion[] = [];

    id(): string {
        return SearchAutocompletePalette.ID;
    }

    protected override initializeContents(containerElement: HTMLElement): void {
        super.initializeContents(containerElement);

        this.autocompleteWidget.inputField.placeholder = 'Search for elements';
        containerElement.setAttribute('aria-label', 'Search Field');
    }
    protected getSuggestionProviders(root: Readonly<SModelRoot>, input: string): IAutocompleteSuggestionProvider[] {
        return [new RevealNamedElementAutocompleteSuggestionProvider(), new RevealEdgeElementAutocompleteSuggestionProvider()];
    }
    protected async retrieveSuggestions(root: Readonly<SModelRoot>, input: string): Promise<LabeledAction[]> {
        const providers = this.getSuggestionProviders(root, input);
        const suggestions = (await Promise.all(providers.map(provider => provider.retrieveSuggestions(root, input)))).flat(1);

        console.log('Update Cacha');
        this.cachedSuggestions = suggestions;

        return suggestions.map(s => s.action);
    }

    protected override async visibleSuggestionsChanged(root: Readonly<SModelRoot>, labeledActions: LabeledAction[]): Promise<void> {
        await this.applyCSS(this.getHiddenElements(root, this.getSuggestionsFromLabeledActions(labeledActions)), CSS_SEARCH_HIDDEN);
        await this.deleteCSS(
            this.getSuggestionsFromLabeledActions(labeledActions).map(s => s.element),
            CSS_SEARCH_HIDDEN
        );
    }

    protected override async selectedSuggestionChanged(
        root: Readonly<SModelRoot>,
        labeledAction?: LabeledAction | undefined
    ): Promise<void> {
        await this.deleteAllCSS(root, CSS_SEARCH_HIGHLIGHTED);
        if (labeledAction !== undefined) {
            const suggestions = this.getSuggestionsFromLabeledActions([labeledAction]);

            const actions: RepositionAction[] = [];
            suggestions.map(currElem => actions.push(RepositionAction.create([currElem.element.id])));

            this.actionDispatcher.dispatchAll(actions);
            await this.applyCSS(
                suggestions.map(s => s.element),
                CSS_SEARCH_HIGHLIGHTED
            );
        }
    }

    public override hide(): void {
        if (this.root !== undefined) {
            this.deleteAllCSS(this.root, CSS_SEARCH_HIDDEN);
            this.deleteAllCSS(this.root, CSS_SEARCH_HIGHLIGHTED);
        }

        super.hide();
    }

    protected applyCSS(elements: SModelElement[], cssClass: string): Promise<void> {
        const actions = elements.map(element => applyCssClasses(element, cssClass));
        return this.actionDispatcher.dispatchAll(actions);
    }

    protected deleteCSS(elements: SModelElement[], cssClass: string): Promise<void> {
        const actions = elements.map(element => deleteCssClasses(element, cssClass));
        return this.actionDispatcher.dispatchAll(actions);
    }

    protected deleteAllCSS(root: Readonly<SModelRoot>, cssClass: string): Promise<void> {
        const actions = toArray(root.index.all().map(element => deleteCssClasses(element, cssClass)));
        return this.actionDispatcher.dispatchAll(actions);
    }

    protected getUnselectedSuggestionsFromLabeledActions(labeledActions: LabeledAction[]): AutocompleteSuggestion[] {
        return this.cachedSuggestions.filter(c => !labeledActions.find(s => isEqual(s, c.action)));
    }

    protected getSuggestionsFromLabeledActions(labeledActions: LabeledAction[]): AutocompleteSuggestion[] {
        return this.cachedSuggestions.filter(c => labeledActions.find(s => isEqual(s, c.action)));
    }

    protected getHiddenSuggestionsFromLabeledActions(labeledActions: LabeledAction[]): AutocompleteSuggestion[] {
        return this.cachedSuggestions.filter(c => !labeledActions.find(s => isEqual(s, c.action)));
    }

    protected getHiddenElements(root: Readonly<SModelRoot>, suggestions: AutocompleteSuggestion[]): SModelElement[] {
        return toArray(
            root.index
                .all()
                .filter(element => element instanceof SNode || element instanceof SEdge)
                .filter(element => suggestions.find(suggestion => suggestion.element.id === element.id) === undefined)
        );
    }
}
