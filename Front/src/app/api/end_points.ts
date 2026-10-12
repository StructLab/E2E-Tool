import { ConstantColorFactor } from "three";
import { NotificationService } from "../services/notification.service";


export const endPoint = "http://localhost:5114";


export async function LoadData(files: File[]) {
    const formData = new FormData();

    for (const file of files) {
        formData.append('files', file); // ✅ MUST be 'files'
    }

    const response = await fetch('http://localhost:5114/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return await response;
}

export interface RinfImportResult {
    zipFiles: number;
    rdfFiles: number;
    triples: number;
    errors: string[];
}

export async function LoadRinfData(
    files: File[]
): Promise<RinfImportResult> {
    const formData = new FormData();

    for (const file of files) {
        formData.append('files', file);
    }

    const response = await fetch(`${endPoint}/rinf/import`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `RINF import failed: ${response.status} ${response.statusText}. ${errorText}`
        );
    }

    return await response.json() as RinfImportResult;
}

export interface RdfRailModelImportResult {
    message: string;
    triples: number;
    tracks: number;
    switches: number;
    bufferStops: number;
}

export async function LoadRdfRailModel(
    file: File
): Promise<RdfRailModelImportResult> {

    const formData = new FormData();

    formData.append('File', file);

    const response = await fetch(
        `${endPoint}/import-rdf`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `RDF import failed: ${response.status} ${response.statusText}. ${errorText}`
        );
    }

    return await response.json() as RdfRailModelImportResult;
}
async function exportFile() {
    let handle: any = null;

    if ('showSaveFilePicker' in window) {
        handle = await (window as any).showSaveFilePicker({
            suggestedName: 'ModelRailway.ttl',
            types: [
                {
                    description: 'Turtle RDF File',
                    accept: {
                        'text/turtle': ['.ttl']
                    }
                }
            ]
        });
    }

    await exportData(handle);
}
export async function exportData(handle: any = null) {
    const response = await fetch(
        `${endPoint}/export`,
        {
            method: 'PUT'
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            errorText || 'RDF export failed'
        );
    }

    const ttlContent = await response.text();

    console.log('Exported Turtle content:', ttlContent);

    if (!ttlContent) {
        throw new Error('Export returned empty Turtle content.');
    }

    const blob = new Blob(
        [ttlContent],
        {
            type: 'text/turtle;charset=utf-8'
        }
    );

    if (handle) {
        const writable = await handle.createWritable();

        await writable.write(blob);
        await writable.close();
    } else {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);

        link.href = objectUrl;
        link.download = 'ModelRailway.ttl';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(objectUrl);
    }
}
export async function CreateSwitch(
    id: string,
    x1: number,
    y1: number
) {
    try {
        const query = new URLSearchParams({
            id: id,
            x1: x1.toString(),
            y1: y1.toString(),
        });

        const response = await fetch(
            `${endPoint}/add/switch?${query.toString()}`,
            {
                method: "PUT",
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);

            throw new Error(
                `API error: ${response.status} ${response.statusText}`
            );
        }

        console.log("Switch created successfully");

        return true;
    } catch (error) {
        console.error("Failed to create switch:", error);
        throw error;
    }
}

export async function CreateLine(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) {
    try {
        const query = new URLSearchParams({
            id,
            x1: x1.toString(),
            y1: y1.toString(),
            x2: x2.toString(),
            y2: y2.toString(),
        });

        const response = await fetch(
            `${endPoint}/add/track?${query.toString()}`,
            {
                method: 'PUT',
            }
        );

        if (!response.ok) {
            throw new Error(
                `API error: ${response.status} ${response.statusText}`
            );
        }

        // Your current API returns Ok() without a body,
        // so don't call response.json().
        console.log('Track created successfully');

        return true;
    } catch (error) {
        console.error('Failed to create track:', error);
        throw error;
    }
}


export async function CreateObject(id: string, type: string, x: number, y: number) {
    try {
        // Build the request payload
        // Build query string
        const query = new URLSearchParams({
            id,
            type,
            x: x.toString(),
            y: y.toString()
        });


        // Call the API endpoint
        const response = await fetch(`${endPoint}/add/${type}?${query.toString()}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result = await response.json();
        console.log('Object created:', result);
        return result;

    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function MoveObject(id: string, x: number, y: number) {
    try {
        // Build the request payload
        // Build query string
        const query = new URLSearchParams({
            id,
            x: x.toString(),
            y: y.toString()
        });
    

        // Call the API endpoint
        const response = await fetch(`${endPoint}/move?${query.toString()}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Failed to move object:', error);
        throw error;
    }
}
export async function Validate() {

    try {
        // Call the API endpoint
        const response = await fetch(`${endPoint}/validate`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result: boolean = await response.json();


        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function Plan() {

    try {
        // Call the API endpoint
        const response = await fetch(`${endPoint}/engineer`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result: boolean = await response.json();
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function ValidateEngineering(id: string, notificationService: NotificationService) {
    // Build the request payload
    // Build query string
    const query = new URLSearchParams({
        id,
    });
  
    try {
        // Call the API endpoint
        const response = await fetch(`${endPoint}/validate/engineering/${encodeURIComponent(id)}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result: boolean = await response.json();
       
        notificationService.notify({
            type: result==true?'success':"error",
            text: 'moved object validated against engineering rules',
            operation: 'move'
          });
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function DeleteObject(id: string) {
    try {
        // Build the request payload
        // Build query string
        const query = new URLSearchParams({
            id,
        });


        // Call the API endpoint
        const response = await fetch(`${endPoint}/delete?${query.toString()}`, {
            method: 'PUT',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result = await response.json();
        console.log('Object deleted:', result);
        return result;

    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function LoadItems(itemName: string, notificationService: NotificationService) {

    try {
        // Call the API endpoint
        const response = await fetch(`${endPoint}/${itemName}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result: any = await response.json();
        notificationService.notify({
            type: "success",
            text: `${itemName} added.`,
            content: result,
            operation: "bufferStops"
        })
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
/*export async function AddTimingPoint(etcsMarkerId: string, notificationService: NotificationService) {

    try {
        // Build the request payload
        // Build query string
        const query = new URLSearchParams({
            etcsMarkerId,
        });


        // Call the API endpoint
        const response = await fetch(`${endPoint}/add/timingPoint?${query.toString()}`, {
            method: 'PUT',
        });

        // Parse the response (if your endpoint returns JSON)
        const result: any = await response.json();
        console.log()
        notificationService.notify({
            type: "success",
            text: `timing point added.`,
            content: result,
            operation: "loading"
        })
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function AddSegmentProfile(x: number, y: number, notificationService: NotificationService) {

    try {
        // Build the request payload
        // Build query string
        const query = new URLSearchParams({
            x: x.toString(),
            y: y.toString(),
        });


        // Call the API endpoint
        const response = await fetch(`${endPoint}/add/segmentProfile?${query.toString()}`, {
            method: 'PUT',
        });

        // Parse the response (if your endpoint returns JSON)
        const result: any = await response.json();
        console.log()
        notificationService.notify({
            type: "success",
            text: `segment profile added.`,
            content: result,
            operation: "loading"
        })
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}*/
export async function LoadSwitches(notificationService: NotificationService) {

    try {
        // Call the API endpoint
        const response = await fetch(`${endPoint}/switches`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Parse the response (if your endpoint returns JSON)
        const result: boolean = await response.json();
        notificationService.notify({
            type: "success",
            text: `switches added.`,
            id: "",
            content: result,
            operation: "loading"
        })
        return result;


    } catch (error) {
        console.error('Failed to create object:', error);
        throw error;
    }
}
export async function QueryRINF(
    query: string = '',
    baliseGroupId: string = ''
) {
    try {
        console.log(
            'Querying RINF with baliseGroupId:',
            baliseGroupId,
            'and query:',
            query
        );

        const response = await fetch(
            `${endPoint}/queryRinf?baliseGroupId=${baliseGroupId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(query)
            }
        );

        if (!response.ok) {
            throw new Error(
                `API error: ${response.status} ${response.statusText}`
            );
        }

        const result = await response.json();

        console.log(
            'RINF query result:',
            result
        );

        return result;
    } catch (error) {
        console.error(
            'Failed to query RINF:',
            error
        );

        throw error;
    }
}

export interface RinfCoordinate {
    longitude: number;
    latitude: number;
}

export interface RinfEnrichedSection {
    sectionUri: string;
    sectionLabel: string | null;
    netReferenceUri: string | null;
    geometryUri: string | null;
    success: boolean;
    expectedLengthMeters: number;
    actualLengthMeters: number;
    differenceMeters: number;
    coordinates: RinfCoordinate[];
}

export interface RinfGeometryResult {
    year: number;
    enrichedCount: number;
    unresolvedCount: number;
    sections: RinfEnrichedSection[];
    unresolved: RinfEnrichedSection[];
}

export async function enrichRinfGeometries(
    year = 2026
): Promise<RinfGeometryResult> {
    const response = await fetch(
        `${endPoint}/rinf/enrich-geometries?year=${year}`,
        {
            method: 'POST'
        }
    );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            errorText ||
            'RINF geometry enrichment failed.'
        );
    }

    const result = await response.json();
    return result as RinfGeometryResult;
}

export interface OsmImportResult {
    railwayPoints: number;
    railwayLines: number;
    firstPoint: unknown;
    firstLine: unknown;
}

export async function LoadOsmData(
    file: File
): Promise<OsmImportResult> {
    const formData = new FormData();

    // OsmController expects the form property to be named File.
    formData.append('File', file);

    const response = await fetch(
        `${endPoint}/osm/import`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `OSM import failed: ${response.status} ` +
            `${response.statusText}. ${errorText}`
        );
    }

    const result =
        await response.json();

    return result as OsmImportResult;
}

export type TrackPoint = [number, number];

export interface TrackDto {
    id: string;
    points: TrackPoint[];
}

export async function LoadTracks(): Promise<TrackDto[]> {
    const response = await fetch(`${endPoint}/tracks`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(
            `Track loading failed: ${response.status} ${response.statusText}`
        );
    }

    return await response.json() as TrackDto[];
}