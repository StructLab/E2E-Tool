
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AssetIdService {

  private counters: Record<string, number> = {};

  private readonly prefixes: Record<string, string> = {
    AxleCounter: 'AX',
    BaliseGroup: 'BG',
    ETCSmarker: 'ET',
    BufferStop: 'BS',
    Switch: 'SW',
    Signal: 'SG'
  };

  generateId(assetType: string): string {

    const prefix = this.prefixes[assetType] ?? 'OBJ';

    this.counters[prefix] =
      (this.counters[prefix] ?? 0) + 1;

    const number = String(
      this.counters[prefix]
    ).padStart(3, '0');

    return `${prefix}${number}`;
  }

  // Prevent duplicates when restoring saved objects
  registerExistingId(displayId: string): void {

    const match = /^([A-Z]+)(\d+)$/.exec(displayId);

    if (!match) return;

    const prefix = match[1];
    const number = Number(match[2]);

    this.counters[prefix] = Math.max(
      this.counters[prefix] ?? 0,
      number
    );
  }
}
