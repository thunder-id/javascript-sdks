import type {ThunderIDSSRData} from '../models/session';

declare global {
  namespace App {
    interface Locals {
      thunderid: ThunderIDSSRData;
    }
  }
}
