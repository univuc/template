/**
 * This file is part of Univuc/{appname}.
 *
 * Copyright (C) 2020 Univuc <potados99@gmail.com>
 *
 * Univuc/{appname}is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Univuc/{appname} is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import logger from '../../common/utils/logger';

import hapi from '@hapi/hapi';
import inert from '@hapi/inert';
import basic from '@hapi/basic';
import Boom from '@hapi/boom';

import config from '../../../config';

async function createServer() {
    const server = getServer();

    await setupServer(server);

    logger.info('Server created.');

    return server;
}

function getServer() {
    return hapi.server({
        port: config.port,
    });
}

async function setupServer(server) {
    await registerPlugins(server);
    await setWebAuth(server);
    await setSlackAuth(server);
    await registerRoutes(server);
}

async function registerPlugins(server) {
    await server.register([
        inert,
    ]);
}

async function setWebAuth(server) {
    const validator = getWebValidator();

    await server.register(basic);

    server.auth.strategy('web', 'basic', {validate: validator});
    server.auth.default('web');
}

function getWebValidator() {
    return async (request, username, password, h) => {
        if (username !== config.web_id) {
            return {credentials: null, isValid: false};
        }

        if (password !== config.web_pw) {
            return {credentials: null, isValid: false};
        }

        return {isValid: true, credentials: {id: config.web_id}};
    };
}

async function setSlackAuth(server) {
    const scheme = (server, options) => {
        return {authenticate: getSlackAuthenticator()};
    };

    server.auth.scheme('slackbot-command-scheme', scheme);
    server.auth.strategy('command', 'slackbot-command-scheme');
}

function getSlackAuthenticator() {
    return (request, h) => {
        const token = request.payload.token;

        if (!token) {
            throw Boom.unauthorized(null, 'slackbot-command-scheme');
        }

        if (token !== config.slack_signing_secret) {
            throw Boom.unauthorized(null, 'slackbot-command-scheme');
        }

        return h.authenticated({credentials: {user: 'slackbot'}});
    };
}


async function registerRoutes(server) {
    await server.register([
        ((await import('./routes/command')).default),
    ]);
}

export default createServer;
