import { Event } from './pure.ts';
export interface ChannelMetadata {
    name: string;
    about: string;
    picture: string;
}
export interface ChannelCreateEventTemplate {
    content: string | ChannelMetadata;
    created_at: number;
    tags?: string[][];
}
export interface ChannelMetadataEventTemplate {
    channel_create_event_id: string;
    content: string | ChannelMetadata;
    created_at: number;
    tags?: string[][];
}
export interface ChannelMessageEventTemplate {
    channel_create_event_id: string;
    reply_to_channel_message_event_id?: string;
    relay_url: string;
    content: string;
    created_at: number;
    tags?: string[][];
}
export interface ChannelHideMessageEventTemplate {
    channel_message_event_id: string;
    content: string | {
        reason: string;
    };
    created_at: number;
    tags?: string[][];
}
export interface ChannelMuteUserEventTemplate {
    content: string | {
        reason: string;
    };
    created_at: number;
    pubkey_to_mute: string;
    tags?: string[][];
}
export declare const channelCreateEvent: (t: ChannelCreateEventTemplate, privateKey: Uint8Array) => Event | undefined;
export declare const channelMetadataEvent: (t: ChannelMetadataEventTemplate, privateKey: Uint8Array) => Event | undefined;
export declare const channelMessageEvent: (t: ChannelMessageEventTemplate, privateKey: Uint8Array) => Event;
export declare const channelHideMessageEvent: (t: ChannelHideMessageEventTemplate, privateKey: Uint8Array) => Event | undefined;
export declare const channelMuteUserEvent: (t: ChannelMuteUserEventTemplate, privateKey: Uint8Array) => Event | undefined;
