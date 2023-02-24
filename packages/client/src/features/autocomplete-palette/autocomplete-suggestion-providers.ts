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

import { CenterAction, SelectAction } from '@eclipse-glsp/protocol';
import { codiconCSSString, isNameable, LabeledAction, name, SEdge, SModelElement, SModelRoot } from 'sprotty';
import { toArray } from 'sprotty/lib/utils/iterable';
import { injectable } from 'inversify';

export interface IAutocompleteSuggestionProvider {
    retrieveSuggestions(root: Readonly<SModelRoot>, text: string): Promise<AutocompleteSuggestion[]>;
}
export interface AutocompleteSuggestion {
    element: SModelElement;
    action: LabeledAction;
}

@injectable()
export class RevealNamedElementAutocompleteSuggestionProvider implements IAutocompleteSuggestionProvider {
    async retrieveSuggestions(root: Readonly<SModelRoot>, text: string): Promise<AutocompleteSuggestion[]> {
        const nameables = toArray(root.index.all().filter(element => isNameable(element)));
        return nameables.map(nameable => ({
            element: nameable,
            action: new LabeledAction(
                `[${nameable.type}] ${name(nameable) ?? '<no-name>'}`,
                [SelectAction.create({ selectedElementsIDs: [nameable.id] }), CenterAction.create([nameable.id])],
                codiconCSSString('eye')
            )
        }));
    }

    async getActions(root: Readonly<SModelRoot>, text: string): Promise<LabeledAction[]> {
        const nameables = toArray(root.index.all().filter(element => isNameable(element)));
        return nameables.map(
            nameable =>
                new LabeledAction(
                    `[${nameable.type}] ${name(nameable) ?? '<no-name>'}`,
                    [SelectAction.create({ selectedElementsIDs: [nameable.id] }), CenterAction.create([nameable.id])],
                    codiconCSSString('eye')
                )
        );
    }
}
@injectable()
export class RevealEdgeElementAutocompleteSuggestionProvider implements IAutocompleteSuggestionProvider {
    async retrieveSuggestions(root: Readonly<SModelRoot>, text: string): Promise<AutocompleteSuggestion[]> {
        const edges = toArray(root.index.all().filter(element => element instanceof SEdge)) as SEdge[];
        return edges.map(edge => ({
            element: edge,
            action: new LabeledAction(
                `[${edge.type}] ` + this.getEdgeLabel(root, edge),
                [SelectAction.create({ selectedElementsIDs: [edge.id] }), CenterAction.create([edge.sourceId, edge.targetId])],
                codiconCSSString('arrow-both')
            )
        }));
    }
    async getActions(root: Readonly<SModelRoot>, text: string): Promise<LabeledAction[]> {
        let edges = toArray(root.index.all().filter(element => element instanceof SEdge)) as SEdge[];
        edges = edges.filter(edge => edge.source && edge.target).filter(edge => isNameable(edge.source!) || isNameable(edge.target!));

        return edges.map(
            edge =>
                new LabeledAction(
                    `[${edge.type}] ` + this.getEdgeLabel(root, edge),
                    [SelectAction.create({ selectedElementsIDs: [edge.id] }), CenterAction.create([edge.sourceId, edge.targetId])],
                    codiconCSSString('arrow-both')
                )
        );
    }

    private getEdgeLabel(root: Readonly<SModelRoot>, edge: SEdge): string {
        let sourceName = '';
        let targetName = '';

        const sourceNode = root.index.getById(edge.sourceId);
        const targetNode = root.index.getById(edge.targetId);

        if (sourceNode !== undefined) {
            sourceName = name(sourceNode) ?? sourceNode.type;
        }
        if (targetNode !== undefined) {
            targetName = name(targetNode) ?? targetNode.type;
        }

        return sourceName + ' -> ' + targetName;
    }
}
