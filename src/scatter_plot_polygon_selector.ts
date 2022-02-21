/*
@license
Copyright 2019 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {Styles} from './styles';

/** Defines the minimum polygon angle (currently 10 degrees) */
const MINIMUM_DISTANCE_TO_CLOSE_POLYGON = 10;

export interface ScatterPolygonTrace {
  // The coordinate (x, y) of each point in the polygon.
  path: [number, number][];
}

/**
 * A class that manages and renders a data selection rectangle.
 */
export class ScatterPlotPolygonSelector {
  private svgElement: SVGElement;
  private polygonElement: SVGPolygonElement;
  private polygonFinalLineElement: SVGLineElement;
  private polylineElement: SVGPolylineElement;
  private container: HTMLElement;

  private startCoordinates: [number, number] = [-1, -1];
  private currentPath: ScatterPolygonTrace = {path: []};

  private selectionCallback: (path: ScatterPolygonTrace) => void;

  /**
   * @param container The container HTML element that the selection SVG rect
   *     will be a child of.
   * @param selectionCallback The callback that accepts a bounding box to be
   *     called when selection changes. Currently, we only call the callback on
   *     mouseUp.
   * @param styles The styles object.
   */
  constructor(
    container: HTMLElement,
    selectionCallback: (path: ScatterPolygonTrace) => void,
    styles: Styles
  ) {
    this.svgElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    this.container = container;
    this.svgElement.style.display = 'none';
    this.svgElement.style.height = '100%';
    this.svgElement.style.width = '100%';
    this.svgElement.style.position = 'absolute';
    this.svgElement.onclick = e => {
      e.preventDefault();
      return false;
    };

    container.insertAdjacentElement('afterbegin', this.svgElement);

    // Prepare a polygon and polyline element, which will render based on if
    // the polygon is completable or not
    this.polygonElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    this.polygonElement.onclick = e => {
      e.preventDefault();
      return false;
    };
    this.polygonElement.style.stroke = styles.select.stroke;
    this.polygonElement.style.strokeWidth = `${styles.select.strokeWidth}`;
    this.polygonElement.style.fill = styles.select.fill;
    this.polygonElement.style.fillOpacity = `${styles.select.fillOpacity}`;
    this.svgElement.appendChild(this.polygonElement);

    this.polylineElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polyline'
    );
    this.polylineElement.onclick = e => {
      e.preventDefault();
      return false;
    };
    this.polylineElement.style.stroke = styles.select.stroke;
    this.polylineElement.style.strokeDasharray = styles.select.strokeDashArray;
    this.polylineElement.style.strokeWidth = `${styles.select.strokeWidth}`;
    this.polylineElement.style.fill = styles.select.fill;
    this.polylineElement.style.fillOpacity = `${styles.select.fillOpacity}`;
    this.svgElement.appendChild(this.polylineElement);

    this.polygonFinalLineElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'line'
    );
    this.polygonFinalLineElement.style.stroke = styles.backgroundColor;
    this.polygonFinalLineElement.style.strokeDasharray =
      styles.select.strokeDashArray;
    this.polygonFinalLineElement.style.strokeWidth = `${styles.select.strokeWidth}`;
    this.svgElement.appendChild(this.polygonFinalLineElement);

    this.selectionCallback = selectionCallback;
  }

  isPolygonComplete() {
    return this.currentPath.path.length > 1;
  }

  isNearStart(offsetX: number, offsetY: number) {
    if (this.currentPath.path.length < 3) return false;
    return (
      this.checkDistanceToStartSq(offsetX, offsetY) <
      MINIMUM_DISTANCE_TO_CLOSE_POLYGON * MINIMUM_DISTANCE_TO_CLOSE_POLYGON
    );
  }

  checkDistanceToStartSq(offsetX: number, offsetY: number) {
    if (this.startCoordinates[0] === -1) return 0;
    const dx = offsetX - this.startCoordinates[0];
    const dy = offsetY - this.startCoordinates[1];
    return dx * dx + dy * dy;
  }

  onLeftMouseClick(offsetX: number, offsetY: number) {
    if (this.currentPath.path.length === 0) {
      this.startCoordinates = [offsetX, offsetY];
      /** If near to start node, close the polygon */
    } else if (this.isPolygonComplete() && this.isNearStart(offsetX, offsetY)) {
      this.selectionCallback(this.currentPath);
      this.resetSVG();
      return;
    }
    this.currentPath.path.push([offsetX, offsetY]);
    this.renderSVG();
  }

  onRightMouseClick() {
    if (this.currentPath.path.length === 0) return;
    if (this.isPolygonComplete()) {
      this.selectionCallback(this.currentPath);
    }
    this.resetSVG();
  }

  onMouseMove(offsetX: number, offsetY: number) {
    if (this.currentPath.path.length === 0) return;
    if (this.isNearStart(offsetX, offsetY))
      this.container.style.cursor = 'pointer';
    else this.container.style.cursor = 'crosshair';
    this.renderSVG([offsetX, offsetY]);
  }

  resetSVG() {
    this.container.style.cursor = 'crosshair';
    this.startCoordinates = [-1, -1];
    this.currentPath.path = [];
    this.renderSVG();
  }

  /** TODO: Dotted lines for hover */
  renderSVG(hoverPoint?: [number, number]) {
    if (this.currentPath.path.length === 0) {
      this.svgElement.style.display = 'none';
      this.polygonElement.style.display = 'none';
      this.polygonElement.setAttribute('points', '');
      this.polylineElement.style.display = 'none';
      this.polylineElement.setAttribute('points', '');
      this.polygonFinalLineElement.style.display = 'none';
      this.polygonFinalLineElement.setAttribute('points', '');
      return;
    }

    this.svgElement.style.display = 'block';
    const currentPath = hoverPoint
      ? [...this.currentPath.path, hoverPoint]
      : this.currentPath.path;
    if (this.isPolygonComplete()) {
      this.polygonElement.style.display = 'block';
      this.polygonElement.setAttribute(
        'points',
        currentPath.map(([x, y]) => `${x},${y}`).join(' ')
      );
      this.polylineElement.style.display = 'none';
      this.polylineElement.setAttribute('points', '');
      this.polygonFinalLineElement.style.display = 'block';
      this.polygonFinalLineElement.setAttribute('x1', `${currentPath[0][0]}`);
      this.polygonFinalLineElement.setAttribute('y1', `${currentPath[0][1]}`);
      this.polygonFinalLineElement.setAttribute(
        'x2',
        `${currentPath[currentPath.length - 1][0]}`
      );
      this.polygonFinalLineElement.setAttribute(
        'y2',
        `${currentPath[currentPath.length - 1][1]}`
      );
    } else {
      this.polygonElement.style.display = 'none';
      this.polygonElement.setAttribute('points', '');
      this.polylineElement.style.display = 'block';
      this.polylineElement.setAttribute(
        'points',
        currentPath.map(([x, y]) => `${x},${y}`).join(' ')
      );
      this.polygonFinalLineElement.style.display = 'none';
      this.polygonFinalLineElement.setAttribute('points', '');
    }
  }
}
