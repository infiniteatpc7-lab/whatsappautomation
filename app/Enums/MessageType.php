<?php

namespace App\Enums;

enum MessageType: string
{
    case TEXT = 'text';
    case IMAGE = 'image';
    case VIDEO = 'video';
    case AUDIO = 'audio';
    case DOCUMENT = 'document';
    case STICKER = 'sticker';
    case LOCATION = 'location';
    case CONTACTS = 'contacts';
    case INTERACTIVE = 'interactive';
    case TEMPLATE = 'template';
    case REACTION = 'reaction';
    case ORDER = 'order';
    case BUTTON = 'button';
    case UNSUPPORTED = 'unsupported';
}
