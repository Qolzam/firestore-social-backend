import { BaseDomain } from '../common'

export class Graph extends BaseDomain {

  constructor (
    /**
     * Left node of graph
     *
     * @type {string}
     * @memberof Graph
     */
  public leftNode: string,

   /**
    * Graph relationship type
    *
    * @type {number}
    * @memberof Graph
    */
  public edgeType: string,

   /**
    * Right node of graph
    *
    * @type {string}
    * @memberof Graph
    */
  public rightNode: string,

   /**
    * Graph metadata
    *
    * @type {string}
    * @memberof Graph
    */
  public metadata: {}
  ) { super() }

}
