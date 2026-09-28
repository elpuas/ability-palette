<?php
/**
 * Plugin Name: Ability Palette
 * Description: Experiments with exposing WordPress Abilities through the Command Palette.
 * Version: 0.1.7
 * Requires at least: 7.1
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: ElPuas Digital Crafts
 * Text Domain: ability-palette
 */

defined( 'ABSPATH' ) || exit;

/**
 * The category is the explicit opt-in for the Command Palette adapter.
 *
 * It uses the supported, first-class Ability category property instead of
 * custom metadata, which is not reliably preserved by the client-side bridge.
 */
function ability_palette_register_category(): void {
	wp_register_ability_category(
		'command-palette',
		array(
			'label'       => __( 'Command Palette', 'ability-palette' ),
			'description' => __( 'Abilities that are available in the WordPress Command Palette.', 'ability-palette' ),
		)
	);
}
add_action( 'wp_abilities_api_categories_init', 'ability_palette_register_category' );

/**
 * Gets the total number of orders with a given WooCommerce status.
 *
 * @param string $status WooCommerce order status without the wc- prefix.
 * @return int
 */
function ability_palette_count_orders_with_status( string $status ): int {
	$result = wc_get_orders(
		array(
			'status'   => $status,
			'limit'    => 1,
			'paginate' => true,
			'return'   => 'ids',
		)
	);

	return isset( $result->total ) ? (int) $result->total : 0;
}

/**
 * Returns the order counts that need attention.
 *
 * @return array<string, int>|WP_Error
 */
function ability_palette_get_orders_needing_attention() {
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return new WP_Error(
			'ability_palette_woocommerce_unavailable',
			__( 'WooCommerce is not available.', 'ability-palette' )
		);
	}

	return array(
		'processing' => ability_palette_count_orders_with_status( 'processing' ),
		'on_hold'    => ability_palette_count_orders_with_status( 'on-hold' ),
	);
}

/**
 * Registers the first Ability Palette example ability.
 */
function ability_palette_register_abilities(): void {
	wp_register_ability(
		'ability-palette/get-orders-needing-attention',
		array(
			'label'               => __( 'Get orders needing attention', 'ability-palette' ),
			'description'         => __( 'Returns the number of processing and on-hold WooCommerce orders.', 'ability-palette' ),
			'category'            => 'command-palette',
			'execute_callback'    => 'ability_palette_get_orders_needing_attention',
			'permission_callback' => static function (): bool {
				return current_user_can( 'manage_woocommerce' );
			},
			'output_schema'       => array(
				'type'                 => 'object',
				'properties'           => array(
					'processing' => array(
						'type'        => 'integer',
						'minimum'     => 0,
						'description' => __( 'Number of orders with processing status.', 'ability-palette' ),
					),
					'on_hold'    => array(
						'type'        => 'integer',
						'minimum'     => 0,
						'description' => __( 'Number of orders with on-hold status.', 'ability-palette' ),
					),
				),
				'required'             => array( 'processing', 'on_hold' ),
				'additionalProperties' => false,
			),
			'meta'                => array(
				'public'      => true,
				'annotations' => array(
					'readonly'   => true,
					'idempotent' => true,
				),
			),
		)
	);
}
add_action( 'wp_abilities_api_init', 'ability_palette_register_abilities' );

/**
 * Loads the generic Ability to Command Palette adapter in wp-admin.
 */
function ability_palette_enqueue_command_palette_adapter(): void {
	wp_enqueue_style(
		'ability-palette-command-palette-adapter',
		plugins_url( 'assets/command-palette-adapter.css', __FILE__ ),
		array( 'wp-components' ),
		'0.1.7'
	);

	wp_enqueue_script(
		'ability-palette-command-palette-adapter',
		plugins_url( 'assets/command-palette-adapter.js', __FILE__ ),
		array( 'wp-commands', 'wp-components', 'wp-data', 'wp-element', 'wp-notices', 'wp-api-fetch', 'wp-url' ),
		'0.1.7',
		array(
			'in_footer'          => true,
			'module_dependencies' => array( '@wordpress/core-abilities' ),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'ability_palette_enqueue_command_palette_adapter' );
