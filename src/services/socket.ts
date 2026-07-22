import { realtime } from './realtime';
import { getSession } from './cookies';

export const connectToServer = async (userId: number) => {
    const session = await getSession();
    const token = session?.token;
    if (!token) return;

    realtime.connect(userId, token);
};

export const onMessage = (handler: (msg: any) => void) => {
    realtime.on('new_message', handler);
    realtime.on('typing', handler);
    realtime.on('ping', handler);
    realtime.on('pong', handler);
};

export const sendMessage = (type: string, data: any) => {
    realtime.send({ type, ...data });
};

export const disconnect = () => {
    realtime.disconnect();
};
