// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * A project.
 */
export interface Project {
  createdAt: string;
  description?: string;
  displayName: string;
  /**
   * Immutable, human-readable identifier of the project.
   */
  handle: string;
  id: string;
}

/**
 * A page of projects, oldest first.
 */
export interface ProjectListResponse {
  count: number;
  links?: ApiPaginationLink[];
  projects: Project[];
  startIndex: number;
  totalResults: number;
}

/**
 * The payload used to create a project.
 */
export interface CreateProjectRequest {
  description?: string;
  displayName: string;
  /**
   * Immutable identifier, unique across projects: lowercase letters, numbers, hyphens and underscores,
   * starting and ending with a letter or a number.
   */
  handle: string;
  /**
   * An identifier to keep, such as one another system already uses for the project. The server
   * generates one when omitted.
   */
  id?: string;
}

/**
 * The payload used to update a project. The handle cannot change; when sent it must be the current one.
 */
export interface UpdateProjectRequest {
  description?: string;
  displayName: string;
  handle?: string;
}
