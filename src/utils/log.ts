/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import { format } from 'date-fns';

export function log(src: any) {
    console.log(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}

export function warn(src: any) {
    console.warn(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}