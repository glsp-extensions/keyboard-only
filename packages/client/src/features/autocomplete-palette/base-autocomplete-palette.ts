/********************************************************************************
 * Copyright (c) 2020-2022 EclipseSource and others.
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
import { inject, injectable } from 'inversify';
import { AbstractUIExtension, ILogger, LabeledAction, SModelRoot, TYPES } from 'sprotty';

import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { AutoCompleteWidget, CloseReason, toActionArray } from '../../base/auto-complete/auto-complete-widget';

@injectable()
export abstract class BaseAutocompletePalette extends AbstractUIExtension {
    protected readonly autoSuggestionSettings = {
        noSuggestionsMessage: 'No suggestions available',
        suggestionsClass: 'command-palette-suggestions',
        debounceWaitMs: 50,
        showOnFocus: true
    };
    protected readonly xOffset = 20;
    protected readonly yOffset = 20;
    protected readonly defaultWidth = 400;

    protected root?: Readonly<SModelRoot>;
    protected autocompleteWidget: AutoCompleteWidget;

    @inject(TYPES.IActionDispatcher)
    protected actionDispatcher: GLSPActionDispatcher;

    @inject(TYPES.ILogger)
    protected override logger: ILogger;

    containerClass(): string {
        return 'command-palette';
    }

    override show(root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        super.show(root, ...contextElementIds);
        this.root = root;
        this.autocompleteWidget.open(root);
    }

    override hide(): void {
        this.autocompleteWidget.dispose();
        this.root = undefined;
        super.hide();
    }

    protected initializeContents(containerElement: HTMLElement): void {
        containerElement.style.position = 'absolute';
        containerElement.style.left = `${this.xOffset}px`;
        containerElement.style.top = `${this.yOffset}px`;
        containerElement.style.width = `${this.defaultWidth}px`;

        this.autocompleteWidget = new AutoCompleteWidget(
            this.autoSuggestionSettings,
            { provideSuggestions: input => this.retrieveSuggestions(this.root!, input) },
            { executeFromSuggestion: input => this.executeSuggestion(input) },
            reason => this.autocompleteHide(reason),
            this.logger,
            suggestions => this.visibleSuggestions(this.root!, suggestions)
        );
        this.autocompleteWidget.initialize(containerElement);
    }

    protected override onBeforeShow(containerElement: HTMLElement, root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        this.autocompleteWidget.inputField.value = '';
    }

    protected abstract retrieveSuggestions(root: Readonly<SModelRoot>, input: string): Promise<LabeledAction[]>;

    protected async visibleSuggestions(root: Readonly<SModelRoot>, suggestions: LabeledAction[]): Promise<void> {
        return;
    }

    protected autocompleteHide(reason: CloseReason): void {
        this.hide();
    }

    protected executeSuggestion(input: LabeledAction | Action[] | Action): void {
        this.actionDispatcher.dispatchAll(toActionArray(input));
    }
}
