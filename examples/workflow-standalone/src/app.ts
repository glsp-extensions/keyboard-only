/********************************************************************************
 * Copyright (c) 2019-2022 EclipseSource and others.
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
    ApplicationIdProvider,
    BaseJsonrpcGLSPClient,
    configureServerActions,
    EnableToolPaletteAction,
    GLSPClient,
    GLSPDiagramServer,
    IActionDispatcher,
    JsonrpcGLSPClient,
    RequestModelAction,
    RequestTypeHintsAction,
    TYPES
} from '@eclipse-glsp/client';
import { join, resolve } from 'path';
import createContainer from './di.config';

const port = 8081;
const id = 'workflow';
const diagramType = 'workflow-diagram';
const websocket = new WebSocket(`ws://localhost:${port}/${id}`);

const loc = window.location.pathname;
const currentDir = loc.substring(0, loc.lastIndexOf('/'));
const examplePath = resolve(join(currentDir, '..', 'app', 'caise23.wf'));
const clientId = ApplicationIdProvider.get() + '_' + examplePath;

const container = createContainer();
const diagramServer = container.get<GLSPDiagramServer>(TYPES.ModelSource);
diagramServer.clientId = clientId;

websocket.onopen = () => {
    const connectionProvider = JsonrpcGLSPClient.createWebsocketConnectionProvider(websocket);
    const glspClient = new BaseJsonrpcGLSPClient({ id, connectionProvider });
    initialize(glspClient);
};

async function initialize(client: GLSPClient): Promise<void> {
    await diagramServer.connect(client);
    const result = await client.initializeServer({
        applicationId: ApplicationIdProvider.get(),
        protocolVersion: GLSPClient.protocolVersion
    });
    await configureServerActions(result, diagramType, container);

    const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);

    await client.initializeClientSession({ clientSessionId: diagramServer.clientId, diagramType });
    actionDispatcher.dispatch(
        RequestModelAction.create({
            options: {
                sourceUri: `file://${examplePath}`,
                diagramType
            }
        })
    );
    actionDispatcher.dispatch(RequestTypeHintsAction.create());
    actionDispatcher.dispatch(EnableToolPaletteAction.create());
}

websocket.onerror = ev => alert('Connection to server errored. Please make sure that the server is running');
