import { EmberServer } from 'emberplus-connection';
import { EmberNodeImpl, NumberedTreeNodeImpl, ParameterAccess, ParameterImpl, ParameterType } from 'emberplus-connection/dist/model';
import { MediaDescription, parse, write } from 'sdp-transform';

const s = new EmberServer(9000); // start server on port 9000

const sdps = {
    video: parse(''),
    audio1: parse(''),
    audio2: parse(''),
    anc: parse(''),
    grouped: parse(''),
};

const videoSdp = new NumberedTreeNodeImpl(
    1,
    new ParameterImpl(
        ParameterType.String,
        'Video SDP',
        'Video SDP',
        '',
        undefined,
        undefined,
        ParameterAccess.ReadWrite
    ));

const audioSdp1 = new NumberedTreeNodeImpl(
    2,
    new ParameterImpl(
        ParameterType.String,
        'Audio SDP 1',
        'Audio SDP 1',
        '',
        undefined,
        undefined,
        ParameterAccess.ReadWrite
    ));

const audioSdp2 = new NumberedTreeNodeImpl(
    3,
    new ParameterImpl(
        ParameterType.String,
        'Audio SDP 2',
        'Audio SDP 2',
        '',
        undefined,
        undefined,
        ParameterAccess.ReadWrite
    ));

const ancSdp = new NumberedTreeNodeImpl(
    4,
    new ParameterImpl(
        ParameterType.String,
        'ANC SDP',
        'ANC SDP',
        '',
        undefined,
        undefined,
        ParameterAccess.ReadWrite
    )
);

const groupedSdp = new NumberedTreeNodeImpl(
    2,
    new ParameterImpl(
        ParameterType.String,
        'Grouped SDP',
        'Grouped SDP',
        '',
        undefined,
        undefined,
        ParameterAccess.Read
    ));

const tree = [
    // create a tree for the provider
    new NumberedTreeNodeImpl(1, new EmberNodeImpl('SDP Merger', 'SDP Merger', true), [
        new NumberedTreeNodeImpl(1, new EmberNodeImpl('Single Essence SDPs', 'Single Essence SDPs'), [
            videoSdp,
            audioSdp1,
            audioSdp2,
            ancSdp,
        ]),

        groupedSdp,
    ])
];

s.onSetValue = async (parameter, value) => {
    if (typeof value === 'string') {
        if (parameter === videoSdp) {
            sdps.video = parse(value);
        }
        if (parameter === audioSdp1) {
            sdps.audio1 = parse(value);
        }
        if (parameter === audioSdp2) {
            sdps.audio2 = parse(value);
        }
        if (parameter === ancSdp) {
            sdps.anc = parse(value);
        }

        sdps.grouped.version = sdps.video.version;
        sdps.grouped.origin = sdps.video.origin;
        sdps.grouped.name = sdps.video.name;
        sdps.grouped.description = sdps.video.description;
        sdps.grouped.timing = sdps.video.timing;
        /// @ts-expect-error Type definitions on DefinitelyTyped are out-of-date
        sdps.grouped.tsRefClocks = sdps.video.tsRefClocks;

        const groups = new Set((<{ type: string, mids: string; }[]>[]).concat(sdps.video.groups ?? [], sdps.audio1.groups ?? [], sdps.audio2.groups ?? [], sdps.anc.groups ?? []));
        sdps.grouped.groups = Array.from(groups);

        sdps.grouped.media = (<Array<{
            type: string;
            port: number;
            protocol: string;
            payloads?: string;
        } & MediaDescription>>[]).concat(sdps.video.media ?? [], sdps.audio1.media ?? [], sdps.audio2.media ?? [], sdps.anc.media ?? []);

        s.update(parameter, { value });
        s.update(groupedSdp, { value: write(sdps.grouped) });
        return true;
    } else {
        return false;
    }
};

s.init(tree); // initiate the provider with the tree
