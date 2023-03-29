/********************************************************************************
 * Copyright (c) 2019-2023 EclipseSource and others.
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
import {
    configureDefaultModelElements,
    configureModelElement,
    ConsoleLogger,
    createDiagramContainer,
    DeleteElementContextMenuItemProvider,
    DiamondNodeView,
    editLabelFeature,
    GEdge,
    GLSPGraph,
    GLSPProjectionView,
    GridSnapper,
    LogLevel,
    overrideViewerOptions,
    RectangularNodeView,
    RevealNamedElementActionProvider,
    RoundedCornerNodeView,
    SCompartment,
    SCompartmentView,
    SLabel,
    SLabelView,
    StructureCompartmentView,
    TYPES
} from '@eclipse-glsp/client';
import toolPaletteModule from '@eclipse-glsp/client/lib/features/tool-palette/di.config';
import keyboardToolPaletteModule from '@eclipse-glsp/client/lib/features/keyboard/tool-palette/di.config';
import { keyboardControlModule } from '@eclipse-glsp/client/lib/features/keyboard/interactions/di.config';
import { keyboardManagerModule } from '@eclipse-glsp/client/lib/features/keyboard/manager/di.config';
import { diagramNavigationModule } from '@eclipse-glsp/client/lib/features/navigation/di.config';
import { focusTrackerModule } from '@eclipse-glsp/client/lib/features/focus-tracker/di.config';
import { DefaultTypes } from '@eclipse-glsp/protocol';
import 'balloon-css/balloon.min.css';
import { Container, ContainerModule } from 'inversify';
import 'sprotty/css/edit-label.css';
import '../css/diagram.css';
import { directTaskEditor } from './direct-task-editing/di.config';
import { ActivityNode, CategoryNode, Icon, TaskNode, WeightedEdge } from './model';
import { IconView, WorkflowEdgeView } from './workflow-views';
import glspAutocompletePaletteModule from '@eclipse-glsp/client/lib/features/autocomplete-palette/di.config';
import glspResizeModule from '@eclipse-glsp/client/lib/features/change-bounds/di.config';
import { glspViewportInteractionsModule } from '@eclipse-glsp/client/lib/features/viewport/di.config';
import cheatSheetModule from '@eclipse-glsp/client/lib/features/cheat-sheet/di.config';

const workflowDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    bind(TYPES.ISnapper).to(GridSnapper);
    bind(TYPES.ICommandPaletteActionProvider).to(RevealNamedElementActionProvider);
    bind(TYPES.IContextMenuItemProvider).to(DeleteElementContextMenuItemProvider);
    const context = { bind, unbind, isBound, rebind };

    configureDefaultModelElements(context);
    configureModelElement(context, 'task:automated', TaskNode, RoundedCornerNodeView);
    configureModelElement(context, 'task:manual', TaskNode, RoundedCornerNodeView);
    configureModelElement(context, 'label:heading', SLabel, SLabelView, { enable: [editLabelFeature] });
    configureModelElement(context, 'comp:comp', SCompartment, SCompartmentView);
    configureModelElement(context, 'comp:header', SCompartment, SCompartmentView);
    configureModelElement(context, 'label:icon', SLabel, SLabelView);
    configureModelElement(context, DefaultTypes.EDGE, GEdge, WorkflowEdgeView);
    configureModelElement(context, 'edge:weighted', WeightedEdge, WorkflowEdgeView);
    configureModelElement(context, 'icon', Icon, IconView);
    configureModelElement(context, 'activityNode:merge', ActivityNode, DiamondNodeView);
    configureModelElement(context, 'activityNode:decision', ActivityNode, DiamondNodeView);
    configureModelElement(context, 'activityNode:fork', ActivityNode, RectangularNodeView);
    configureModelElement(context, 'activityNode:join', ActivityNode, RectangularNodeView);
    configureModelElement(context, DefaultTypes.GRAPH, GLSPGraph, GLSPProjectionView);
    configureModelElement(context, 'category', CategoryNode, RoundedCornerNodeView);
    configureModelElement(context, 'struct', SCompartment, StructureCompartmentView);
});

export default function createContainer(widgetId: string): Container {
    const container = createDiagramContainer(workflowDiagramModule, directTaskEditor);
    container.unload(toolPaletteModule);
    container.load(keyboardToolPaletteModule);
    container.load(keyboardControlModule);
    container.load(glspAutocompletePaletteModule);
    container.load(glspResizeModule);
    container.load(glspViewportInteractionsModule);
    container.load(cheatSheetModule);
    container.load(diagramNavigationModule);
    container.load(keyboardManagerModule);
    container.load(focusTrackerModule);

    overrideViewerOptions(container, {
        baseDiv: widgetId,
        hiddenDiv: widgetId + '_hidden'
    });

    return container;
}
