/**
 * Maps client-side Abilities in the command-palette category to commands.
 *
 * This adapter intentionally knows nothing about any individual Ability. It
 * leaves permissions, inputs, and execution to the Ability. It renders any
 * returned value generically, using the Ability's output schema only for
 * presentation hints.
 */
( async () => {
	const coreAbilities = await import( '@wordpress/core-abilities' );

	await coreAbilities.ready;

	const { executeAbility, getAbilities } = await import( '@wordpress/abilities' );
	const { Modal, Button } = window.wp.components;
	const { createElement, createRoot, Fragment, useState } = window.wp.element;
	const { registerCommand } = window.wp.data.dispatch( window.wp.commands.store );
	const { createErrorNotice, createSuccessNotice } = window.wp.data.dispatch(
		window.wp.notices.store
	);
	const coreSnackbarSelector = [
		'.edit-post-layout__snackbar',
		'.edit-site-layout__snackbar',
		'.edit-widgets-notices__snackbar',
	].join( ', ' );
	const hasCoreSnackbar = document.querySelector( coreSnackbarSelector );
	let showResult;

	/**
	 * Converts an object key into a readable fallback label.
	 *
	 * @param {string} key Object key from an Ability result.
	 * @return {string} Readable label.
	 */
	function humanizeKey( key ) {
		return key
			.replace( /([a-z0-9])([A-Z])/g, '$1 $2' )
			.replace( /[_-]+/g, ' ' )
			.replace( /^./, ( character ) => character.toUpperCase() );
	}

	/**
	 * Gets the schema that describes one object property.
	 *
	 * @param {Object|undefined} schema Parent output schema.
	 * @param {string}           key    Property name.
	 * @return {Object|undefined} Property schema, when available.
	 */
	function getPropertySchema( schema, key ) {
		if ( ! schema || typeof schema !== 'object' ) {
			return undefined;
		}

		if ( schema.properties && typeof schema.properties === 'object' ) {
			if ( schema.properties[ key ] ) {
				return schema.properties[ key ];
			}
		}

		return typeof schema.additionalProperties === 'object'
			? schema.additionalProperties
			: undefined;
	}

	/**
	 * Gets the schema that describes one array item.
	 *
	 * @param {Object|undefined} schema Parent output schema.
	 * @param {number}            index  Array item index.
	 * @return {Object|undefined} Item schema, when available.
	 */
	function getItemSchema( schema, index ) {
		if ( ! schema || typeof schema !== 'object' || ! schema.items ) {
			return undefined;
		}

		if ( Array.isArray( schema.items ) ) {
			return schema.items[ index ];
		}

		return schema.items;
	}

	/**
	 * Renders an Ability result as safe React text nodes. Runtime output is the
	 * source of truth; schemas provide labels and supporting descriptions only.
	 *
	 * @param {*}                value  Ability result value.
	 * @param {Object|undefined} schema Matching output schema.
	 * @return {Object} React element.
	 */
	function renderResultValue( value, schema ) {
		if ( value === null ) {
			return createElement( 'span', { className: 'ability-palette-result__value' }, 'null' );
		}

		if ( Array.isArray( value ) ) {
			if ( value.length === 0 ) {
				return createElement( 'p', { className: 'ability-palette-result__empty' }, 'No items.' );
			}

			return createElement(
				'ol',
				{ className: 'ability-palette-result__array' },
				value.map( ( item, index ) =>
					createElement(
						'li',
						{ key: index },
						renderResultValue( item, getItemSchema( schema, index ) )
					)
				)
			);
		}

		if ( typeof value === 'object' ) {
			const entries = Object.entries( value );

			if ( entries.length === 0 ) {
				return createElement( 'p', { className: 'ability-palette-result__empty' }, 'No fields.' );
			}

			return createElement(
				'dl',
				{ className: 'ability-palette-result__list' },
				entries.map( ( [ key, item ] ) => {
					const itemSchema = getPropertySchema( schema, key );
					const isComplex = item !== null && typeof item === 'object';
					const label = itemSchema?.title || humanizeKey( key );

					return createElement(
						'div',
						{
							className: `ability-palette-result__item${
								isComplex ? ' is-complex' : ''
							}`,
							key,
						},
						createElement( 'dt', null, label ),
						createElement(
							'dd',
							null,
							renderResultValue( item, itemSchema )
						),
						itemSchema?.description &&
							createElement(
								'p',
								{ className: 'ability-palette-result__description' },
								itemSchema.description
							)
					);
				} )
			);
		}

		return createElement(
			'span',
			{ className: 'ability-palette-result__value' },
			String( value )
		);
	}

	/**
	 * Provides the persistent, generic result surface for every palette command.
	 *
	 * @return {Object} React element.
	 */
	function AdapterSurfaces() {
		const [ presentation, setPresentation ] = useState( null );

		showResult = setPresentation;

		if ( ! presentation ) {
			return createElement(
				Fragment,
				null,
				! hasCoreSnackbar &&
					createElement( window.wp.notices.SnackbarNotices, {
						className: 'ability-palette-snackbar',
					} )
			);
		}

		const { ability, result } = presentation;
		const descriptionId = 'ability-palette-result-description';

		return createElement(
			Fragment,
			null,
			! hasCoreSnackbar &&
				createElement( window.wp.notices.SnackbarNotices, {
					className: 'ability-palette-snackbar',
				} ),
			createElement(
				Modal,
				{
					title: ability.label || ability.name,
					size: 'medium',
					onRequestClose: () => setPresentation( null ),
					...( ability.description
						? { 'aria-describedby': descriptionId }
						: {} ),
				},
				ability.description &&
					createElement(
						'p',
						{ id: descriptionId, className: 'ability-palette-result__intro' },
						ability.description
					),
				createElement(
					'div',
					{ className: 'ability-palette-result' },
					renderResultValue( result, ability.output_schema )
				),
				createElement(
					'div',
					{ className: 'ability-palette-result__actions' },
					createElement(
						Button,
						{ variant: 'primary', onClick: () => setPresentation( null ) },
						'Done'
					)
				)
			)
		);
	}

	const adapterRoot = document.createElement( 'div' );

	document.body.append( adapterRoot );
	createRoot( adapterRoot ).render( createElement( AdapterSurfaces ) );

	getAbilities( { category: 'command-palette' } ).forEach( ( ability ) => {
		registerCommand( {
			name: ability.name,
			label: ability.label,
			category: 'action',
			callback: async ( { close } ) => {
				const label = ability.label || ability.name;

				try {
					const result = await executeAbility( ability.name );

					close();
					window.requestAnimationFrame( () => {
						if ( typeof result === 'undefined' ) {
							createSuccessNotice( `${ label } completed.`, {
								type: 'snackbar',
							} );
							return;
						}

						showResult( { ability, result } );
					} );
				} catch {
					close();
					createErrorNotice( `${ label } could not be completed.`, {
						type: 'snackbar',
					} );
				}
			},
		} );
	} );
} )();
