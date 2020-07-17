/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-env mocha */

'use strict';

const OpenWhiskInvoker = require('../src/invoker');
const Docker = require('dockerode');
const assert = require("assert");

const ACTION_NAME = "myaction";
const ACTION_METADATA = {
    exec: {
        kind: "nodejs"
    },
    limits: {
    }
};
const WSK_PROPS = {
    namespace: "namespace"
};
const WSK = {
    actions: {
        client: {
            request: async function() {
                return {
                    runtimes: {
                        nodejs: [{
                            kind: "nodejs",
                            image: "adobeapiplatform/adobe-action-nodejs-v10:3.0.21"
                        }]
                    }
                }
            }
        }
    }
};

const docker = new Docker();

async function isContainerRunning(id) {
    const containers = await docker.listContainers();
    for (const container of containers) {
        if (container.Id === id) {
            return true;
        }
    }
    return false;
}


describe('invoker',  function() {

    it("should detect and replace an existing container", async function() {
        console.log("start test");
        // preparation: start first container with right fields using dockerode
        const previousInvoker = new OpenWhiskInvoker(ACTION_NAME, ACTION_METADATA, {}, WSK_PROPS, WSK);
        console.log("prepare");
        await previousInvoker.prepare();
        console.log("startContainer");
        await previousInvoker.startContainer(() => {});
        const previousContainerId = previousInvoker.container.id;

        console.log("2nd invoker");
        // start second container
        const invoker = new OpenWhiskInvoker(ACTION_NAME, ACTION_METADATA, {}, WSK_PROPS, WSK);

        let id;

        try {
            console.log("prepare");
            await invoker.prepare();
            console.log("startContainer");
            await invoker.startContainer(() => {});

            id = invoker.container.id;

            console.log("isContainerRunning");
            // verify it replaced the container (old id gone, new id with same label there)
            assert.ok(!await isContainerRunning(previousContainerId), "container was not replaced");

        } finally {
            console.log("stop");
            await invoker.stop();

            if (id) {
                console.log("isContainerRunning");
                // verify the new container is gone
                assert.ok(!await isContainerRunning(id), "container was not removed");
            }
        }
        console.log("end");
    }).timeout(30000);
});
