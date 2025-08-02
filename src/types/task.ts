export interface Task {
    id: string;
    tenantId: string;
    type: string;
    payload: any
    createdAt: number
}