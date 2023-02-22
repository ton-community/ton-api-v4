/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createBackoff } from 'teslabot';

export const backoff = createBackoff({ onError: (e, f) => f > 3 && console.warn(e) });