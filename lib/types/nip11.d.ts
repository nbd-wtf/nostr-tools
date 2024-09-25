export declare function useFetchImplementation(fetchImplementation: any): void;
export declare function fetchRelayInformation(url: string): Promise<RelayInformation>;
/**
 * ## Relay Information Document

 * Relays may provide server metadata to clients to inform
 * them of capabilities, administrative contacts, and
 * various server attributes. This is made available as a
 * JSON document over HTTP, on the same URI as the relay's
 * websocket.

 * Any field may be omitted, and clients MUST ignore any
 * additional fields they do not understand. Relays MUST
 * accept CORS requests by sending
 * `Access-Control-Allow-Origin`,
 * `Access-Control-Allow-Headers`, and
 * `Access-Control-Allow-Methods` headers.
 * @param name string identifying relay
 * @param description string with detailed information
 * @param pubkey administrative contact pubkey
 * @param contact: administrative alternate contact
 * @param supported_nips a list of NIP numbers supported by
 * the relay
 * @param software identifying relay software URL
 * @param version string version identifier
 */
export interface BasicRelayInformation {
    name: string;
    description: string;
    pubkey: string;
    contact: string;
    supported_nips: number[];
    software: string;
    version: string;
}
/**
 *  * ## Extra Fields

 *  * ### Server Limitations

 * These are limitations imposed by the relay on clients.
 * Your client should expect that requests which exceed
 * these practical_ limitations are rejected or fail immediately.
 * @param max_message_length this is the maximum number of
 * bytes for incoming JSON that the relay will attempt to
 * decode and act upon. When you send large subscriptions,
 * you will be limited by this value. It also effectively
 * limits the maximum size of any event. Value is calculated
 * from `[` to `]` and is after UTF-8 serialization (so some
 * unicode characters will cost 2-3 bytes). It is equal to
 * the maximum size of the WebSocket message frame.
 * @param max_subscriptions total number of subscriptions
 * that may be active on a single websocket connection to
 * this relay. It's possible that authenticated clients with
 * a (paid) relationship to the relay may have higher limits.
 * @param max_filters maximum number of filter values in
 * each subscription. Must be one or higher.
 * @param max_limit the relay server will clamp each
 * filter's `limit` value to this number.
 * This means the client won't be able to get more than this
 * number of events from a single subscription filter. This
 * clamping is typically done silently by the relay, but
 * with this number, you can know that there are additional
 * results if you narrowed your filter's time range or other
 * parameters.
 * @param max_subid_length maximum length of subscription id as a
 * string.
 * @param min_prefix for `authors` and `ids` filters which
 * are to match against a hex prefix, you must provide at
 * least this many hex digits in the prefix.
 * @param max_event_tags in any event, this is the maximum
 * number of elements in the `tags` list.
 * @param max_content_length maximum number of characters in
 * the `content` field of any event. This is a count of
 * unicode characters. After serializing into JSON it may be
 * larger (in bytes), and is still subject to the
 * max_message_length`, if defined.
 * @param min_pow_difficulty new events will require at
 * least this difficulty of PoW, based on [NIP-13](13.md),
 * or they will be rejected by this server.
 * @param auth_required this relay requires [NIP-42](42.md)
 * authentication to happen before a new connection may
 * perform any other action. Even if set to False,
 * authentication may be required for specific actions.
 * @param restricted_writes: this relay requires some kind
 * of condition to be fulfilled in order to accept events
 * (not necessarily, but including
 * @param payment_required this relay requires payment
 * before a new connection may perform any action.
 * @param created_at_lower_limit: 'created_at' lower limit
 * @param created_at_upper_limit: 'created_at' upper limit
 */
export interface Limitations {
    max_message_length: number;
    max_subscriptions: number;
    max_filters: number;
    max_limit: number;
    max_subid_length: number;
    min_prefix: number;
    max_event_tags: number;
    max_content_length: number;
    min_pow_difficulty: number;
    auth_required: boolean;
    payment_required: boolean;
    created_at_lower_limit: number;
    created_at_upper_limit: number;
    restricted_writes: boolean;
}
interface RetentionDetails {
    kinds: (number | number[])[];
    time?: number | null;
    count?: number | null;
}
type AnyRetentionDetails = RetentionDetails;
/**
 * ### Event Retention

 * There may be a cost associated with storing data forever,
 * so relays may wish to state retention times. The values
 * stated here are defaults for unauthenticated users and
 * visitors. Paid users would likely have other policies.

 * Retention times are given in seconds, with `null`
 * indicating infinity. If zero is provided, this means the
 * event will not be stored at all, and preferably an error
 * will be provided when those are received.
 * ```json
{
...
  "retention": [
    { "kinds": [0, 1, [5, 7], [40, 49]], "time": 3600 },
    { "kinds": [[40000, 49999]], "time": 100 },
    { "kinds": [[30000, 39999]], "count": 1000 },
    { "time": 3600, "count": 10000 }
  ]
...
}
```
 * @param retention is a list of specifications: each will
 * apply to either all kinds, or a subset of kinds. Ranges
 * may be specified for the kind field as a tuple of
 * inclusive start and end values. Events of indicated kind
 * (or all) are then limited to a `count` and/or time
 * period.

 * It is possible to effectively blacklist Nostr-based
 * protocols that rely on a specific `kind` number, by
 * giving a retention time of zero for those `kind` values.
 * While that is unfortunate, it does allow clients to
 * discover servers that will support their protocol quickly
 * via a single HTTP fetch.

 * There is no need to specify retention times for
 * _ephemeral events_ as defined in [NIP-16](16.md) since
 * they are not retained.
 */
export interface Retention {
    retention: AnyRetentionDetails[];
}
/**
 * Some relays may be governed by the arbitrary laws of a
 * nation state. This may limit what content can be stored
 * in cleartext on those relays. All clients are encouraged
 * to use encryption to work around this limitation.

 * It is not possible to describe the limitations of each
 * country's laws and policies which themselves are
 * typically vague and constantly shifting.

 * Therefore, this field allows the relay operator to
 * indicate which countries' laws might end up being
 * enforced on them, and then indirectly on their users'
 * content.

 * Users should be able to avoid relays in countries they
 * don't like, and/or select relays in more favourable
 * zones. Exposing this flexibility is up to the client
 * software.

 * @param relay_countries a list of two-level ISO country
 * codes (ISO 3166-1 alpha-2) whose laws and policies may
 * affect this relay. `EU` may be used for European Union
 * countries.

 * Remember that a relay may be hosted in a country which is
 * not the country of the legal entities who own the relay,
 * so it's very likely a number of countries are involved.
 */
export interface ContentLimitations {
    relay_countries: string[];
}
/**
 * ### Community Preferences

 * For public text notes at least, a relay may try to foster
 * a local community. This would encourage users to follow
 * the global feed on that relay, in addition to their usual
 * individual follows. To support this goal, relays MAY
 * specify some of the following values.

 * @param language_tags  is an ordered list of [IETF
 * language
 * tags](https://en.wikipedia.org/wiki/IETF_language_tag
 * indicating the major languages spoken on the relay.
 * @param tags is a list of limitations on the topics to be
 * discussed. For example `sfw-only` indicates that only
 * "Safe For Work" content is encouraged on this relay. This
 * relies on assumptions of what the "work" "community"
 * feels "safe" talking about. In time, a common set of tags
 * may emerge that allow users to find relays that suit
 * their needs, and client software will be able to parse
 * these tags easily. The `bitcoin-only` tag indicates that
 * any _altcoin_, _"crypto"_ or _blockchain_ comments will
 * be ridiculed without mercy.
 * @param posting_policy is a link to a human-readable page
 * which specifies the community policies for the relay. In
 * cases where `sfw-only` is True, it's important to link to
 * a page which gets into the specifics of your posting
 * policy.

 * The `description` field should be used to describe your
 * community goals and values, in brief. The
 * `posting_policy` is for additional detail and legal
 * terms. Use the `tags` field to signify limitations on
 * content, or topics to be discussed, which could be
 * machine processed by appropriate client software.
 */
export interface CommunityPreferences {
    language_tags: string[];
    tags: string[];
    posting_policy: string;
}
export interface Amount {
    amount: number;
    unit: 'msat';
}
export interface PublicationAmount extends Amount {
    kinds: number[];
}
export interface Subscription extends Amount {
    period: number;
}
export interface Fees {
    admission: Amount[];
    subscription: Subscription[];
    publication: PublicationAmount[];
}
/**
 * Relays that require payments may want to expose their fee
 * schedules.
 */
export interface PayToRelay {
    payments_url: string;
    fees: Fees;
}
/**
 * A URL pointing to an image to be used as an icon for the
 * relay. Recommended to be squared in shape.
 */
export interface Icon {
    icon: string;
}
export type RelayInformation = BasicRelayInformation & Partial<Retention> & {
    limitation?: Partial<Limitations>;
} & Partial<ContentLimitations> & Partial<CommunityPreferences> & Partial<PayToRelay> & Partial<Icon>;
export {};
